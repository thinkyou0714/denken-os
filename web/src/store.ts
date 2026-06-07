/**
 * store.ts — ブラウザのローカル進捗（localStorage）。
 * offline-first の小さな key/value 状態は localStorage で十分（調査の定石）。
 * Storage を注入可能にし、DOM 無しでもテストできる。
 */
import type { AnswerLog } from "../../lib/scheduler/diagnosis.js";
import { dueLapseIds, type LapseMap, updateLapse } from "../../lib/scheduler/lapse-queue.js";
import { deriveRating } from "../../lib/scheduler/rating.js";
import { Sm2Scheduler } from "../../lib/scheduler/sm2.js";
import type { ReviewState, Scheduler } from "../../lib/scheduler/types.js";
import { mergeBackup, parseBackup, serializeBackup } from "./backup.js";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const REVIEW_KEY = "denken:reviews";
const LOG_KEY = "denken:logs";
const LAPSE_KEY = "denken:lapses";
const DAY_MS = 86_400_000;
/** 解答ログの保持上限（リングバッファ）。診断は直近履歴で十分で、localStorage 5MiB 上限を守る。 */
const MAX_LOGS = 5000;
/** 既定の「1日」境界は日本標準時(UTC+9)。電験は国内試験で受験者は JST 生活のため、
 *  朝7時(JST)の学習が UTC では前日扱いになりストリークが途切れる不具合を避ける。 */
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

export class LocalProgress {
  constructor(
    private storage: StorageLike,
    /** 日境界のタイムゾーンオフセット(ms)。既定 JST。テストで上書き可。 */
    private dayOffsetMs: number = JST_OFFSET_MS,
    /** 採点スケジューラ。既定 SM-2。FsrsReviewScheduler 等に差し替え可能（統一 Scheduler）。 */
    private scheduler: Scheduler = new Sm2Scheduler(),
  ) {}

  /** epoch ms をオフセット込みの「日番号」に落とす（同一日の判定・連続日数に使う）。 */
  private dayIndex(ms: number): number {
    return Math.floor((ms + this.dayOffsetMs) / DAY_MS);
  }

  private read<T>(key: string, fallback: T): T {
    const raw = this.storage.getItem(key);
    if (!raw) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  private reviews(): Record<string, ReviewState> {
    return this.read<Record<string, ReviewState>>(REVIEW_KEY, {});
  }

  logs(): AnswerLog[] {
    return this.read<AnswerLog[]>(LOG_KEY, []);
  }

  getReview(topic: string): ReviewState | undefined {
    return this.reviews()[topic];
  }

  allReviews(): Map<string, ReviewState> {
    return new Map(Object.entries(this.reviews()));
  }

  /** 採点を記録し、SM-2 で記憶状態を更新する。 */
  record(
    topic: string,
    correct: boolean,
    nowMs: number = Date.now(),
    timeMs?: number,
    problemId?: string,
  ): ReviewState {
    const prev = this.getReview(topic) ?? this.scheduler.init(nowMs);
    // 解答時間から4段階 Rating を導く（速い正解=easy / 遅い正解=hard）。
    const next = this.scheduler.review(prev, deriveRating(correct, timeMs), nowMs);

    const reviews = this.reviews();
    reviews[topic] = next;
    const logs = this.logs();
    logs.push({ topic, correct, atMs: nowMs, timeMs, problemId });
    this.persist(reviews, logs);
    // 問題単位の relearning キュー: 誤答は再出題予定に積み、正解で卒業（SCHED-LAPSE-QUEUE）。
    if (problemId) {
      try {
        this.storage.setItem(LAPSE_KEY, JSON.stringify(updateLapse(this.lapses(), problemId, correct, nowMs)));
      } catch {
        /* lapse は補助情報。容量超過時は無視（採点本体は persist 済）。 */
      }
    }
    return next;
  }

  private lapses(): LapseMap {
    return this.read<LapseMap>(LAPSE_KEY, {});
  }

  /** 再出題予定が到来した問題ID（問題単位 relearning。pickNext が優先する）。 */
  dueLapses(nowMs: number = Date.now()): string[] {
    return dueLapseIds(this.lapses(), nowMs);
  }

  /**
   * reviews/logs を localStorage に保存する。容量超過(QuotaExceededError)で例外を投げて
   * 採点が黙って壊れる/部分書き込みで不整合になるのを防ぐ。logs を上限件数のリングに保ち、
   * それでも溢れたら直近半分へ間引いて1回だけ再試行する（診断は直近履歴で十分）。
   */
  private persist(reviews: Record<string, ReviewState>, logs: AnswerLog[]): void {
    const capped = logs.length > MAX_LOGS ? logs.slice(logs.length - MAX_LOGS) : logs;
    if (this.trySetBoth(reviews, capped)) return;
    // 容量超過: 古いログを半分捨てて 1 回だけ再試行。
    const half = capped.slice(Math.floor(capped.length / 2));
    this.trySetBoth(reviews, half);
  }

  /** logs を先に（大きい方）、reviews を後に書く。失敗は握り潰し false を返す（UI を壊さない）。 */
  private trySetBoth(reviews: Record<string, ReviewState>, logs: AnswerLog[]): boolean {
    try {
      this.storage.setItem(LOG_KEY, JSON.stringify(logs));
      this.storage.setItem(REVIEW_KEY, JSON.stringify(reviews));
      return true;
    } catch {
      return false;
    }
  }

  /** 学習データを JSON 文字列で書き出す（バックアップ・端末移行）。 */
  exportData(): string {
    return serializeBackup(this.reviews(), this.logs());
  }

  /** JSON を取り込み既存とマージして保存する。壊れた JSON は false（無変更）。 */
  importData(json: string): boolean {
    const backup = parseBackup(json);
    if (!backup) return false;
    const merged = mergeBackup({ reviews: this.reviews(), logs: this.logs() }, backup);
    this.persist(merged.reviews, merged.logs);
    return true;
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
