/**
 * store.ts — ブラウザのローカル進捗（localStorage）。
 * offline-first の小さな key/value 状態は localStorage で十分（調査の定石）。
 * Storage を注入可能にし、DOM 無しでもテストできる。
 */
import type { AnswerLog } from "../../lib/scheduler/diagnosis.js";
import { Sm2Scheduler } from "../../lib/scheduler/sm2.js";
import type { ReviewState } from "../../lib/scheduler/types.js";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const REVIEW_KEY = "denken:reviews";
const LOG_KEY = "denken:logs";
const DAY_MS = 86_400_000;

export class LocalProgress {
  private scheduler = new Sm2Scheduler();
  constructor(private storage: StorageLike) {}

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
  record(topic: string, correct: boolean, nowMs: number = Date.now(), timeMs?: number): ReviewState {
    const prev = this.getReview(topic) ?? this.scheduler.init(nowMs);
    const next = this.scheduler.review(prev, correct ? "good" : "again", nowMs);

    const reviews = this.reviews();
    reviews[topic] = next;
    this.storage.setItem(REVIEW_KEY, JSON.stringify(reviews));

    const logs = this.logs();
    logs.push({ topic, correct, atMs: nowMs, timeMs });
    this.storage.setItem(LOG_KEY, JSON.stringify(logs));
    return next;
  }

  /** 今日まで連続して学習した日数（UTC 日基準）。 */
  streakDays(nowMs: number = Date.now()): number {
    const days = new Set(this.logs().map((l) => Math.floor(l.atMs / DAY_MS)));
    if (days.size === 0) return 0;
    const today = Math.floor(nowMs / DAY_MS);
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
    const today = Math.floor(nowMs / DAY_MS);
    const ms = this.logs()
      .filter((l) => Math.floor(l.atMs / DAY_MS) === today)
      .reduce((a, l) => a + (l.timeMs ?? 0), 0);
    return Math.round(ms / 60_000);
  }
}
