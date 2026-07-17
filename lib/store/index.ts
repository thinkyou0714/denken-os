/**
 * store/index.ts — 永続化の抽象（03 stats / 05 解答履歴・記憶状態の保存先）。
 *
 * 設計: インターフェースを切り、既定はインメモリ実装。Supabase 実装は
 * このインターフェースを満たすアダプタとして後から差し込む（human-tasks の認証取得後）。
 * これにより 03/05 のロジックを実DBなしでエンドツーエンドにテストできる。
 *
 * ## 並行性・トランザクション制限（II-140）
 *
 * ストア実装ごとの並行性保証:
 *
 * | 実装                    | 並行性                                | トランザクション              |
 * |------------------------|--------------------------------------|-------------------------------|
 * | InMemory*              | 単一プロセス・シングルスレッド前提    | なし（Map 操作は即時反映）   |
 * | File*                  | 単一プロセス推奨（複数プロセス非対応）| なし（原子的 rename のみ）   |
 * | Supabase*              | 複数クライアント対応（DB 側で管理）   | 単一テーブル操作のみ（ストア間 2PC なし）|
 *
 * 複数ストアを跨ぐ操作（例: problems + answerLogs を同時更新）は原子ではない。
 * 半端な状態が残るリスクがあるため、アプリ側でべき等・冪等な更新を設計すること。
 */
import type { Problem } from "../engine/schema.js";
import type { AnswerLog } from "../scheduler/diagnosis.js";
import type { ReviewState } from "../scheduler/types.js";

/**
 * 問題データの永続化インターフェース。
 *
 * 契約:
 * - `upsert`: 同じ id のエントリが存在すれば上書き、なければ新規作成。
 * - `get`: 存在しない id は `undefined` を返す（例外は投げない）。
 * - `list`: filter 省略 = 全件。複数フィルタは AND で絞る。
 * - いずれも DB エラー等の IO 失敗時は `Error` を throw する。
 * - 実装: `InMemoryProblemStore`（テスト用）/ `FileProblemStore`（CLI用）/ `SupabaseProblemStore`（本番）。
 */
export interface ProblemStore {
  upsert(p: Problem): Promise<void>;
  get(id: string): Promise<Problem | undefined>;
  list(filter?: { status?: Problem["status"]; topic?: string }): Promise<Problem[]>;
}

/**
 * 解答ログの永続化インターフェース。
 *
 * 契約:
 * - `append`: ログを末尾追記する（既存ログは変更しない）。
 * - `byUser`: 指定ユーザーの全ログを atMs 昇順で返す。ユーザーがいない場合は空配列。
 * - IO 失敗時は `Error` を throw する。
 * - 実装: `InMemoryAnswerLogStore` / `FileAnswerLogStore` / `SupabaseAnswerLogStore`。
 */
export interface AnswerLogStore {
  append(userId: string, log: AnswerLog): Promise<void>;
  byUser(userId: string): Promise<AnswerLog[]>;
}

/**
 * 記憶状態（スペーシング情報）の永続化インターフェース。
 *
 * 契約:
 * - `get`: ユーザー×論点の記憶状態を返す。未登録なら `undefined`（例外は投げない）。
 * - `set`: 同じ userId × topic があれば上書き、なければ新規作成。
 * - `byUser`: 指定ユーザーの全論点→状態 Map を返す。ユーザーがいない場合は空 Map。
 * - IO 失敗時は `Error` を throw する。
 * - 実装: `InMemoryReviewStateStore` / `FileReviewStateStore` / `SupabaseReviewStateStore`。
 */
export interface ReviewStateStore {
  /** ユーザー×論点の記憶状態を取得（無ければ undefined）。 */
  get(userId: string, topic: string): Promise<ReviewState | undefined>;
  set(userId: string, topic: string, state: ReviewState): Promise<void>;
  byUser(userId: string): Promise<Map<string, ReviewState>>;
}

export class InMemoryProblemStore implements ProblemStore {
  private map = new Map<string, Problem>();
  async upsert(p: Problem): Promise<void> {
    this.map.set(p.id, p);
  }
  async get(id: string): Promise<Problem | undefined> {
    return this.map.get(id);
  }
  async list(filter?: { status?: Problem["status"]; topic?: string }): Promise<Problem[]> {
    return [...this.map.values()].filter(
      (p) =>
        (filter?.status === undefined || p.status === filter.status) &&
        (filter?.topic === undefined || p.topic === filter.topic),
    );
  }
}

export class InMemoryAnswerLogStore implements AnswerLogStore {
  private byUserMap = new Map<string, AnswerLog[]>();
  async append(userId: string, log: AnswerLog): Promise<void> {
    const arr = this.byUserMap.get(userId) ?? [];
    arr.push(log);
    this.byUserMap.set(userId, arr);
  }
  async byUser(userId: string): Promise<AnswerLog[]> {
    // 契約は「atMs 昇順」。Supabase 実装は DB の order で保証するため、
    // 追記順に依存せずここでもソートして 3 実装の挙動を揃える。
    return [...(this.byUserMap.get(userId) ?? [])].sort((a, b) => a.atMs - b.atMs);
  }
}

export class InMemoryReviewStateStore implements ReviewStateStore {
  private map = new Map<string, ReviewState>();
  private key(userId: string, topic: string): string {
    return `${userId}::${topic}`;
  }
  async get(userId: string, topic: string): Promise<ReviewState | undefined> {
    return this.map.get(this.key(userId, topic));
  }
  async set(userId: string, topic: string, state: ReviewState): Promise<void> {
    this.map.set(this.key(userId, topic), state);
  }
  async byUser(userId: string): Promise<Map<string, ReviewState>> {
    const out = new Map<string, ReviewState>();
    const prefix = `${userId}::`;
    for (const [k, v] of this.map) {
      if (k.startsWith(prefix)) out.set(k.slice(prefix.length), v);
    }
    return out;
  }
}

// ── エンタイトルメント（課金 tier）永続化（収益化レイヤー・休眠設計）─────────────
//
// 収益化の gate（無料/Pro）に使う購読状態。設計方針:
//   - サーバが真実源。webhook（Stripe）が service_role で書き、ユーザーは自分の行のみ読める。
//   - 課金は既定 OFF（feature flag）で休眠。flag OFF 時は resolveEntitlement 側で既定 tier に短絡する。
//   - CC-BY-SA データ本体は gate しない。Pro が解放するのは「サービス」（適応/同期/無限/深い解説）のみ。
// 詳細: docs/monetization/ARCHITECTURE.md §A.3。

/** 課金 tier。free = 無料枠 / pro = 有料。 */
export type EntitlementTier = "free" | "pro";

/** 購読ステータス（Stripe subscription.status に対応。none = 未購読）。 */
export type EntitlementStatus = "active" | "trialing" | "past_due" | "canceled" | "none";

/** entitlement の由来。default = 既定(未購読) / stripe = 決済由来 / grant = 手動付与。 */
export type EntitlementSource = "stripe" | "grant" | "default";

/** Pro が解放する機能（フリーミアム境界）。CC-BY-SA データ本体はここに含めない。 */
export type ProFeature = "unlimitedPractice" | "adaptiveSelection" | "deepExplanations" | "cloudSync";

/**
 * ユーザーの課金 entitlement。
 * `updatedAtMs` は最終更新時刻（webhook 反映時刻）。`currentPeriodEndMs` は購読期間末（null=無し）。
 */
export interface Entitlement {
  userId: string;
  tier: EntitlementTier;
  status: EntitlementStatus;
  source: EntitlementSource;
  currentPeriodEndMs: number | null;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  updatedAtMs: number;
}

/**
 * entitlement 永続化インターフェース。
 *
 * 契約:
 * - `get`: userId の entitlement を返す。未登録なら `undefined`（例外は投げない）。
 * - `byStripeCustomer`: Stripe customer ID から逆引き（webhook が user を解決する経路）。無ければ `undefined`。
 * - `upsert`: 同じ userId があれば上書き、なければ新規作成。**書きは service_role/webhook のみ**（RLS で保証）。
 * - IO 失敗時は `Error` を throw する。
 * - 実装: `InMemoryEntitlementStore` / `FileEntitlementStore` / `SupabaseEntitlementStore`。
 */
export interface EntitlementStore {
  get(userId: string): Promise<Entitlement | undefined>;
  byStripeCustomer(customerId: string): Promise<Entitlement | undefined>;
  upsert(e: Entitlement): Promise<void>;
}

/**
 * 未購読ユーザーの既定 entitlement（free）。課金 flag OFF 時や未登録時のフォールバック。
 * 純関数（nowMs は明示注入でテスト可能。省略時は現在時刻）。
 */
export function defaultEntitlement(userId: string, nowMs: number = Date.now()): Entitlement {
  return {
    userId,
    tier: "free",
    status: "none",
    source: "default",
    currentPeriodEndMs: null,
    updatedAtMs: nowMs,
  };
}

/**
 * entitlement が指定 Pro 機能を許可するかの純関数（サーバ真実源 gate の核）。
 * free tier は Pro 機能を一切許可しない。pro tier でも status が active/trialing でなければ不許可。
 * 課金 flag との合成（休眠時の短絡）は web 側 resolveEntitlement が担う（本関数は tier×status のみ判定）。
 */
export function entitlementAllows(e: Entitlement, _feature: ProFeature): boolean {
  if (e.tier !== "pro") return false;
  return e.status === "active" || e.status === "trialing";
}

export class InMemoryEntitlementStore implements EntitlementStore {
  private map = new Map<string, Entitlement>();
  async get(userId: string): Promise<Entitlement | undefined> {
    return this.map.get(userId);
  }
  async byStripeCustomer(customerId: string): Promise<Entitlement | undefined> {
    for (const e of this.map.values()) {
      if (e.stripeCustomerId === customerId) return e;
    }
    return undefined;
  }
  async upsert(e: Entitlement): Promise<void> {
    this.map.set(e.userId, e);
  }
}
