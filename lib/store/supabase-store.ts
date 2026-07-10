/**
 * supabase-store.ts — store インターフェースの Supabase 実装（05 / supabase/migrations の DDL に対応）。
 *
 * 既定はインメモリ/ファイル実装。本実装は認証取得後（human-tasks.md）に
 *   const stores = createSupabaseStores(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!)
 * で差し込む。行⇔ドメインのマッピングは純関数として切り出し、テスト可能にしている
 * （実 I/O は薄いラッパ）。
 *
 * zod 検証: rowToProblem / rowToReviewState / rowToAnswerLog は zod スキーマで検証し、
 * パース失敗時は「どのテーブルのどの id か」を含むエラーを投げる（I-022）。
 * 正常系データは全て通過するため、既存テストは無変更でグリーンになる。
 *
 * エラーラッパ: fail(op, error) で操作名付きのエラーに統一する（I-023）。
 * URL/key の空チェック: createSupabaseStores で早期失敗（I-024）。
 *
 * ## lenient モード（II-138）
 *
 * 既定は strict（zod 検証失敗 = 例外）。`lenient: true` を指定するとパース失敗行を
 * スキップして警告を出し、成功した行だけを返す（recovery 戦略）。
 * 1件の破損行が全件取得を止める問題を回避する。
 *
 * - 既定は strict のため既存テスト・既存動作は変わらない。
 * - lenient はオプトイン（デバッグ・マイグレーション中の救済用途）。
 *   本番で全件 lenient にするとデータ破損を検出できなくなるため、
 *   通常は strict のまま運用し、障害調査時のみ lenient を使う。
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Problem } from "../engine/schema.js";
import { problemSchema } from "../engine/schema.js";
import type { AnswerLog } from "../scheduler/diagnosis.js";
import type { ReviewState } from "../scheduler/types.js";
import type { AnswerLogStore, Entitlement, EntitlementStore, ProblemStore, ReviewStateStore } from "./index.js";

// ── lenient モード オプション（II-138）────────────────────────────────────────

/**
 * lenient モードのオプション型。
 *
 * `lenient: true` にするとzod検証失敗の行をスキップして警告を出すため、
 * 1件の破損行があっても残りの行を返せる（recovery 戦略）。
 * 既定は `false`（strict：従来通り例外を投げる）。
 */
export interface LenientOptions {
  /** zod 検証失敗時にスキップ＋warning を出す（既定: false = strict）。 */
  lenient?: boolean;
}

// ── エラーラッパ（I-023）────────────────────────────────────────────────────

/**
 * Supabase 操作の失敗を統一フォーマットで投げる内部ヘルパー。
 * 例: `fail("problems.upsert", error)` → `Error: problems.upsert failed: <message>`
 */
function fail(op: string, error: { message: string }): never {
  throw new Error(`${op} failed: ${error.message}`);
}

// ── 行 ⇔ ドメイン マッピング（純関数・テスト対象）──────────────────────────

export interface ProblemRow {
  id: string;
  exam: string | null;
  subject: string;
  topic: string;
  format: string;
  difficulty: number;
  statement: string;
  choices: string[] | null;
  answer: string;
  solution: string[];
  validation: Problem["validation"];
  source: Problem["source"];
  stats: Problem["stats"] | null;
  status: string;
}

export function problemToRow(p: Problem): ProblemRow {
  return {
    id: p.id,
    exam: p.exam ?? null,
    subject: p.subject,
    topic: p.topic,
    format: p.format ?? "multiple_choice",
    difficulty: p.difficulty,
    statement: p.statement,
    choices: p.choices ?? null,
    answer: p.answer,
    solution: p.solution,
    validation: p.validation,
    source: p.source,
    stats: p.stats ?? null,
    status: p.status ?? "draft",
  };
}

/**
 * DB 行を Problem ドメインオブジェクトへ変換する。
 * zod で検証し、失敗時は `"problems table, id=<id>"` を含むエラーを投げる（I-022）。
 */
export function rowToProblem(r: ProblemRow): Problem {
  const raw = {
    id: r.id,
    exam: r.exam ?? undefined,
    subject: r.subject,
    topic: r.topic,
    format: r.format,
    difficulty: r.difficulty,
    statement: r.statement,
    choices: r.choices ?? undefined,
    answer: r.answer,
    solution: r.solution,
    validation: r.validation,
    source: r.source,
    stats: r.stats ?? undefined,
    status: r.status,
  };
  const result = problemSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`problems table, id=${r.id}: ${issues}`);
  }
  return result.data;
}

export interface ReviewStateRow {
  user_id: string;
  topic: string;
  reps: number;
  lapses: number;
  interval_days: number;
  ease: number;
  due_at: string; // ISO
  last_review_at: string | null;
}

/** zod スキーマ: review_states テーブル行の最小検証。 */
const reviewStateRowSchema = z.object({
  reps: z.number().int().min(0),
  lapses: z.number().int().min(0),
  interval_days: z.number().min(0),
  ease: z.number().min(0),
  due_at: z.string().datetime({ offset: true }),
  last_review_at: z.string().datetime({ offset: true }).nullable(),
});

export function reviewStateToRow(userId: string, topic: string, s: ReviewState): ReviewStateRow {
  return {
    user_id: userId,
    topic,
    reps: s.reps,
    lapses: s.lapses,
    interval_days: s.intervalDays,
    ease: s.ease,
    due_at: new Date(s.dueMs).toISOString(),
    last_review_at: s.lastReviewMs === null ? null : new Date(s.lastReviewMs).toISOString(),
  };
}

/**
 * DB 行を ReviewState ドメインオブジェクトへ変換する。
 * zod で検証し、失敗時は `"review_states table, user=<userId> topic=<topic>"` を含むエラーを投げる（I-022）。
 */
export function rowToReviewState(r: ReviewStateRow): ReviewState {
  const result = reviewStateRowSchema.safeParse(r);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`review_states table, user=${r.user_id} topic=${r.topic}: ${issues}`);
  }
  const d = result.data;
  return {
    reps: d.reps,
    lapses: d.lapses,
    intervalDays: d.interval_days,
    ease: d.ease,
    dueMs: new Date(d.due_at).getTime(),
    lastReviewMs: d.last_review_at === null ? null : new Date(d.last_review_at).getTime(),
  };
}

/** zod スキーマ: answer_logs テーブル行の最小検証。 */
const answerLogRowSchema = z.object({
  topic: z.string().min(1),
  correct: z.boolean(),
  time_ms: z.number().nullable(),
  answered_at: z.string().datetime({ offset: true }),
  // 空文字の problem_id は実質「未設定」だが truthy 判定をすり抜けて誤参照を招くため、
  // null か非空文字列のみ受理する（append は null を書くので空文字は本来入らない）。
  problem_id: z.string().min(1).nullable(),
});

/**
 * DB 行を AnswerLog ドメインオブジェクトへ変換する。
 * zod で検証し、失敗時は `"answer_logs table, user=<userId>"` を含むエラーを投げる（I-022）。
 */
function rowToAnswerLog(r: Record<string, unknown>, userId: string): AnswerLog {
  const result = answerLogRowSchema.safeParse(r);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`answer_logs table, user=${userId}: ${issues}`);
  }
  const d = result.data;
  return {
    topic: d.topic,
    correct: d.correct,
    atMs: new Date(d.answered_at).getTime(),
    ...(d.time_ms !== null && d.time_ms !== undefined ? { timeMs: d.time_ms } : {}),
    ...(d.problem_id !== null && d.problem_id !== undefined ? { problemId: d.problem_id } : {}),
  };
}

// ── entitlements 行 ⇔ ドメイン（収益化・0006 migration に対応）──────────────

export interface EntitlementRow {
  user_id: string;
  tier: string;
  status: string;
  source: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: string | null; // ISO
  updated_at: string; // ISO
}

/** zod スキーマ: entitlements テーブル行の検証（tier/status/source は enum で厳密化）。 */
const entitlementRowSchema = z.object({
  user_id: z.string().min(1),
  tier: z.enum(["free", "pro"]),
  status: z.enum(["active", "trialing", "past_due", "canceled", "none"]),
  source: z.enum(["stripe", "grant", "default"]),
  stripe_customer_id: z.string().min(1).nullable(),
  stripe_subscription_id: z.string().min(1).nullable(),
  current_period_end: z.string().datetime({ offset: true }).nullable(),
  updated_at: z.string().datetime({ offset: true }),
});

export function entitlementToRow(e: Entitlement): EntitlementRow {
  return {
    user_id: e.userId,
    tier: e.tier,
    status: e.status,
    source: e.source,
    stripe_customer_id: e.stripeCustomerId ?? null,
    stripe_subscription_id: e.stripeSubscriptionId ?? null,
    current_period_end: e.currentPeriodEndMs === null ? null : new Date(e.currentPeriodEndMs).toISOString(),
    updated_at: new Date(e.updatedAtMs).toISOString(),
  };
}

/**
 * DB 行を Entitlement ドメインオブジェクトへ変換する。
 * zod で検証し、失敗時は `"entitlements table, user=<userId>"` を含むエラーを投げる（I-022 と同流儀）。
 */
export function rowToEntitlement(r: EntitlementRow): Entitlement {
  const result = entitlementRowSchema.safeParse(r);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`entitlements table, user=${r.user_id}: ${issues}`);
  }
  const d = result.data;
  return {
    userId: d.user_id,
    tier: d.tier,
    status: d.status,
    source: d.source,
    currentPeriodEndMs: d.current_period_end === null ? null : new Date(d.current_period_end).getTime(),
    updatedAtMs: new Date(d.updated_at).getTime(),
    ...(d.stripe_customer_id !== null ? { stripeCustomerId: d.stripe_customer_id } : {}),
    ...(d.stripe_subscription_id !== null ? { stripeSubscriptionId: d.stripe_subscription_id } : {}),
  };
}

// ── ストア実装（薄い I/O ラッパ）──────────────────────────────────────────

export class SupabaseProblemStore implements ProblemStore {
  constructor(private client: SupabaseClient) {}

  async upsert(p: Problem): Promise<void> {
    const { error } = await this.client.from("problems").upsert(problemToRow(p));
    if (error) fail("problems.upsert", error);
  }

  async get(id: string): Promise<Problem | undefined> {
    const { data, error } = await this.client.from("problems").select("*").eq("id", id).maybeSingle();
    if (error) fail("problems.get", error);
    return data ? rowToProblem(data as ProblemRow) : undefined;
  }

  async list(filter?: { status?: Problem["status"]; topic?: string }): Promise<Problem[]>;
  /**
   * lenient モード付きの list（II-138）。`lenient: true` でzod失敗行をスキップ。
   * 既定（lenient 省略 / false）は従来の strict 挙動。
   */
  async list(filter?: { status?: Problem["status"]; topic?: string }, opts?: LenientOptions): Promise<Problem[]>;
  async list(filter?: { status?: Problem["status"]; topic?: string }, opts?: LenientOptions): Promise<Problem[]> {
    let q = this.client.from("problems").select("*");
    if (filter?.status) q = q.eq("status", filter.status);
    if (filter?.topic) q = q.eq("topic", filter.topic);
    const { data, error } = await q;
    if (error) fail("problems.list", error);
    if (opts?.lenient) {
      const results: Problem[] = [];
      for (const r of data ?? []) {
        try {
          results.push(rowToProblem(r as ProblemRow));
        } catch (e) {
          console.warn(
            `problems.list [lenient]: 行をスキップしました id=${(r as ProblemRow).id}:`,
            e instanceof Error ? e.message : e,
          );
        }
      }
      return results;
    }
    return (data ?? []).map((r) => rowToProblem(r as ProblemRow));
  }
}

export class SupabaseAnswerLogStore implements AnswerLogStore {
  constructor(private client: SupabaseClient) {}

  async append(userId: string, log: AnswerLog): Promise<void> {
    const { error } = await this.client.from("answer_logs").insert({
      user_id: userId,
      problem_id: log.problemId ?? null,
      topic: log.topic,
      correct: log.correct,
      time_ms: log.timeMs ?? null,
      answered_at: new Date(log.atMs).toISOString(),
    });
    if (error) fail("answer_logs.insert", error);
  }

  async byUser(userId: string): Promise<AnswerLog[]>;
  /**
   * lenient モード付きの byUser（II-138）。`lenient: true` でzod失敗行をスキップ。
   * 既定（lenient 省略 / false）は従来の strict 挙動。
   */
  async byUser(userId: string, opts?: LenientOptions): Promise<AnswerLog[]>;
  async byUser(userId: string, opts?: LenientOptions): Promise<AnswerLog[]> {
    const { data, error } = await this.client
      .from("answer_logs")
      .select("topic, correct, time_ms, answered_at, problem_id")
      .eq("user_id", userId)
      .order("answered_at", { ascending: true });
    if (error) fail("answer_logs.byUser", error);
    if (opts?.lenient) {
      const results: AnswerLog[] = [];
      for (const r of data ?? []) {
        try {
          results.push(rowToAnswerLog(r as Record<string, unknown>, userId));
        } catch (e) {
          console.warn(
            `answer_logs.byUser [lenient]: ユーザー ${userId} の行をスキップしました:`,
            e instanceof Error ? e.message : e,
          );
        }
      }
      return results;
    }
    return (data ?? []).map((r: Record<string, unknown>) => rowToAnswerLog(r, userId));
  }
}

export class SupabaseReviewStateStore implements ReviewStateStore {
  constructor(private client: SupabaseClient) {}

  async get(userId: string, topic: string): Promise<ReviewState | undefined> {
    const { data, error } = await this.client
      .from("review_states")
      .select("*")
      .eq("user_id", userId)
      .eq("topic", topic)
      .maybeSingle();
    if (error) fail("review_states.get", error);
    return data ? rowToReviewState(data as ReviewStateRow) : undefined;
  }

  async set(userId: string, topic: string, state: ReviewState): Promise<void> {
    const { error } = await this.client.from("review_states").upsert(reviewStateToRow(userId, topic, state));
    if (error) fail("review_states.upsert", error);
  }

  async byUser(userId: string): Promise<Map<string, ReviewState>>;
  /**
   * lenient モード付きの byUser（II-138）。`lenient: true` でzod失敗行をスキップ。
   * 既定（lenient 省略 / false）は従来の strict 挙動。
   */
  async byUser(userId: string, opts?: LenientOptions): Promise<Map<string, ReviewState>>;
  async byUser(userId: string, opts?: LenientOptions): Promise<Map<string, ReviewState>> {
    const { data, error } = await this.client.from("review_states").select("*").eq("user_id", userId);
    if (error) fail("review_states.byUser", error);
    const out = new Map<string, ReviewState>();
    for (const r of data ?? []) {
      const row = r as ReviewStateRow;
      if (opts?.lenient) {
        try {
          out.set(row.topic, rowToReviewState(row));
        } catch (e) {
          console.warn(
            `review_states.byUser [lenient]: ユーザー ${userId} topic=${row.topic} の行をスキップしました:`,
            e instanceof Error ? e.message : e,
          );
        }
      } else {
        out.set(row.topic, rowToReviewState(row));
      }
    }
    return out;
  }
}

export class SupabaseEntitlementStore implements EntitlementStore {
  constructor(private client: SupabaseClient) {}

  async get(userId: string): Promise<Entitlement | undefined> {
    const { data, error } = await this.client.from("entitlements").select("*").eq("user_id", userId).maybeSingle();
    if (error) fail("entitlements.get", error);
    return data ? rowToEntitlement(data as EntitlementRow) : undefined;
  }

  async byStripeCustomer(customerId: string): Promise<Entitlement | undefined> {
    const { data, error } = await this.client
      .from("entitlements")
      .select("*")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();
    if (error) fail("entitlements.byStripeCustomer", error);
    return data ? rowToEntitlement(data as EntitlementRow) : undefined;
  }

  async upsert(e: Entitlement): Promise<void> {
    // 書きは service_role/webhook のみ。RLS は entitlements にユーザー write policy を持たないため
    // 認証ユーザーの client では拒否される（service_role のみが RLS を bypass する）。
    const { error } = await this.client.from("entitlements").upsert(entitlementToRow(e));
    if (error) fail("entitlements.upsert", error);
  }
}

/**
 * 既に構築済みの SupabaseClient から全ストアを作る（T11 seam）。
 * `createSupabaseStores(url,key)` は静的キーで session を持たないため、RLS 下で `auth.uid()` が NULL になり
 * ユーザー所有テーブル（answer_logs / review_states / entitlements）の読み書きが機能しない。
 * Next.js の `@supabase/ssr` で作った **per-user 認証クライアント（session JWT 付き）** を渡すと
 * `auth.uid()` が解決し RLS が正しく効く。webhook からは service_role client を渡す（RLS bypass）。
 */
export function createStoresForClient(client: SupabaseClient) {
  return {
    problems: new SupabaseProblemStore(client),
    answerLogs: new SupabaseAnswerLogStore(client),
    reviewStates: new SupabaseReviewStateStore(client),
    entitlements: new SupabaseEntitlementStore(client),
  };
}

/**
 * URL と key（service_role か anon）からストアをまとめて作る。
 * url または key が空文字・空白のみの場合は早期に例外を投げる（I-024）。
 * 注: 静的キーで session を持たないため、per-user RLS が要る用途では `createStoresForClient` に
 * 認証済みクライアントを渡すこと（本関数は service_role / CLI / 公開読み取り向け）。
 */
export function createSupabaseStores(url: string, key: string) {
  if (!url.trim()) throw new Error("createSupabaseStores: url が空です");
  if (!key.trim()) throw new Error("createSupabaseStores: key が空です");
  return createStoresForClient(createClient(url, key));
}
