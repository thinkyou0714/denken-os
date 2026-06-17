/**
 * store.ts — ブラウザのローカル進捗（localStorage）。
 * offline-first の小さな key/value 状態は localStorage で十分（調査の定石）。
 * Storage を注入可能にし、DOM 無しでもテストできる。
 *
 * スケジューラは FSRS（Free Spaced Repetition Scheduler）を採用する。
 * 研究上 FSRS は SM-2 比で同じ保持率を 20〜30% 少ない復習で達成でき、
 * 4段階評価（again/hard/good/easy）で記憶状態（安定度・難易度）を分離管理する。
 * 互換のため record() は boolean（正誤）も受け付け、true→good / false→again に写像する。
 */
import type { Card } from "ts-fsrs";
import type { AnswerLog } from "../../lib/scheduler/diagnosis.js";
import { FsrsScheduler, type FsrsView } from "../../lib/scheduler/fsrs.js";
import type { Rating } from "../../lib/scheduler/types.js";
import { dayIndex as _dayIndex, JST_OFFSET_MS } from "./dates.js";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** localStorage に保存する Card（Date を ISO 文字列にしたもの）。 */
type StoredCard = Omit<Card, "due" | "last_review"> & { due: string; last_review?: string };

/** 解答ログ（AnswerLog に4段階評価を添える）。 */
export interface WebAnswerLog extends AnswerLog {
  rating?: Rating;
}

const CARD_KEY = "denken:cards";
const LOG_KEY = "denken:logs";
const RETENTION_KEY = "denken:retention";
/** 解答ログの保持上限。無限成長で localStorage quota（〜5MB）に達すると
 *  以後の保存がすべて失敗するため、古い順に間引く（1日10問×500日分は保持）。 */
export const LOG_CAP = 5000;

/**
 * II-151: localStorage の使用量を推定する（JSON.stringify の文字数をバイト近似値として使用）。
 * ブラウザの quota（一般に 5MB〜10MB）に対して何 KB 使っているかを返す。
 * 推定値のため実際の quota 残量とは一致しない場合があるが、警告の目安として十分。
 * @returns 推定使用量（KB）
 */
export function estimateStorageKb(storage: StorageLike, keys: readonly string[]): number {
  let total = 0;
  for (const key of keys) {
    const v = storage.getItem(key);
    if (v !== null) total += key.length + v.length;
  }
  // UTF-16 の文字列を UTF-8 に近似（ASCII 主体なので ×1 が妥当な近似）。
  return Math.round(total / 1024);
}

/** localStorage quota の推奨警告閾値（KB）。この値を超えたら UI で通知する。 */
export const STORAGE_WARN_KB = 3_000; // 3 MB 超で警告

function ratingOf(x: Rating | boolean): Rating {
  if (typeof x === "boolean") return x ? "good" : "again";
  return x;
}

function reviveCard(s: StoredCard): Card {
  return {
    ...s,
    due: new Date(s.due),
    last_review: s.last_review ? new Date(s.last_review) : undefined,
  } as Card;
}

export class LocalProgress {
  private scheduler: FsrsScheduler;
  /** 最後に保存が失敗したキーと時刻（成功でクリア）。G6 が保存失敗 UI に利用する。 */
  private _lastPersistError: { key: string; atMs: number } | null = null;

  constructor(
    private storage: StorageLike,
    /** 日境界のタイムゾーンオフセット(ms)。既定 JST。テストで上書き可。 */
    private dayOffsetMs: number = JST_OFFSET_MS,
  ) {
    this.scheduler = new FsrsScheduler(this.desiredRetention());
  }

  /**
   * 最後に localStorage 保存が失敗したキーと時刻。
   * iOS プライベートモードや quota 超過時に記録される。保存成功でクリアされる。
   * G6（app.ts 分割後）が保存失敗をユーザーに通知するために使う。
   */
  get lastPersistError(): { key: string; atMs: number } | null {
    return this._lastPersistError;
  }

  /** epoch ms をオフセット込みの「日番号」に落とす（同一日の判定・連続日数に使う）。 */
  private dayIndex(ms: number): number {
    return _dayIndex(ms, this.dayOffsetMs);
  }

  private read<T>(key: string, fallback: T): T {
    const raw = this.storage.getItem(key);
    if (!raw) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      console.warn(`[store] JSON.parse 失敗: key=${key}`);
      return fallback;
    }
  }

  /** 書き込みの安全ラッパ。iOS プライベートモードや quota 超過で setItem が
   *  throw すると採点フロー全体が落ちるため、保存失敗は学習継続より劣後させる
   *  （その回の永続化は諦め、アプリは動き続ける）。失敗時は lastPersistError に記録。 */
  private safeSet(key: string, value: string): void {
    try {
      this.storage.setItem(key, value);
      // 保存成功: エラー記録をクリア
      this._lastPersistError = null;
    } catch {
      // 保存不能（プライベートモード・容量超過）。クラッシュさせない。
      this._lastPersistError = { key, atMs: Date.now() };
    }
  }

  private cards(): Record<string, StoredCard> {
    return this.read<Record<string, StoredCard>>(CARD_KEY, {});
  }

  /** 目標保持率（FSRS の最重要設定）。設定タブから変更可能（既定0.9）。 */
  desiredRetention(): number {
    const raw = this.storage.getItem(RETENTION_KEY);
    const n = raw ? Number(raw) : Number.NaN;
    return Number.isFinite(n) && n >= 0.7 && n <= 0.97 ? n : 0.9;
  }

  setDesiredRetention(value: number): void {
    const clamped = Math.min(0.97, Math.max(0.7, value));
    this.safeSet(RETENTION_KEY, String(clamped));
    this.scheduler = new FsrsScheduler(clamped);
  }

  logs(): WebAnswerLog[] {
    return this.read<WebAnswerLog[]>(LOG_KEY, []);
  }

  /** topic の記憶状態ビュー（次回復習予定・安定度など）。 */
  getCardView(topic: string): FsrsView | undefined {
    const c = this.cards()[topic];
    return c ? this.scheduler.view(reviveCard(c)) : undefined;
  }

  allCardViews(): Map<string, FsrsView> {
    const out = new Map<string, FsrsView>();
    for (const [topic, c] of Object.entries(this.cards())) {
      out.set(topic, this.scheduler.view(reviveCard(c)));
    }
    return out;
  }

  /** 復習期限が来ている topic を期限の早い順に返す。 */
  dueTopics(nowMs: number = Date.now()): string[] {
    return [...this.allCardViews().entries()]
      .filter(([, v]) => v.dueMs <= nowMs)
      .sort((a, b) => a[1].dueMs - b[1].dueMs)
      .map(([topic]) => topic);
  }

  /** 採点を記録し、FSRS で記憶状態を更新する。rating は4段階 or 正誤boolean。 */
  record(
    topic: string,
    ratingOrCorrect: Rating | boolean,
    nowMs: number = Date.now(),
    timeMs?: number,
    problemId?: string,
  ): FsrsView {
    const rating = ratingOf(ratingOrCorrect);
    const now = new Date(nowMs);
    // cards() は localStorage 全体を読んで JSON.parse する。1解答につき1回だけ読む。
    const cards = this.cards();
    const stored = cards[topic];
    const prev = stored ? reviveCard(stored) : this.scheduler.init(now);
    const next = this.scheduler.review(prev, rating, now);

    cards[topic] = next as unknown as StoredCard; // Date は JSON で ISO 文字列化される
    this.safeSet(CARD_KEY, JSON.stringify(cards));

    const logs = this.logs();
    logs.push({
      topic,
      correct: rating !== "again",
      atMs: nowMs,
      rating,
      ...(timeMs !== undefined ? { timeMs } : {}),
      ...(problemId !== undefined ? { problemId } : {}),
    });
    if (logs.length > LOG_CAP) logs.splice(0, logs.length - LOG_CAP); // 古い順に間引く
    this.safeSet(LOG_KEY, JSON.stringify(logs));
    return this.scheduler.view(next);
  }

  /** 今日まで連続して学習した日数（既定 JST 日基準）。 */
  streakDays(nowMs: number = Date.now()): number {
    const days = new Set(this.logs().map((l) => this.dayIndex(l.atMs)));
    if (days.size === 0) return 0;
    const today = this.dayIndex(nowMs);
    // 今日 or 昨日から遡って連続日数を数える（今日未学習でも昨日まで継続中なら維持）。
    let cursor = days.has(today) ? today : today - 1;
    if (!days.has(cursor)) return 0;
    let streak = 0;
    while (days.has(cursor)) {
      streak += 1;
      cursor -= 1;
    }
    return streak;
  }

  todayMinutes(nowMs: number = Date.now()): number {
    const today = this.dayIndex(nowMs);
    const ms = this.logs()
      .filter((l) => this.dayIndex(l.atMs) === today)
      .reduce((a, l) => a + (l.timeMs ?? 0), 0);
    return Math.round(ms / 60_000);
  }
}
