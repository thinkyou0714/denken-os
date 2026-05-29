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
const EXAM_KEY = "denken:examDate";
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

  /** 採点を記録し、SM-2 で記憶状態を更新する。subject は科目別到達度の集計に使う。 */
  record(topic: string, correct: boolean, nowMs: number = Date.now(), timeMs?: number, subject?: string): ReviewState {
    const prev = this.getReview(topic) ?? this.scheduler.init(nowMs);
    const next = this.scheduler.review(prev, correct ? "good" : "again", nowMs);

    const reviews = this.reviews();
    reviews[topic] = next;
    this.storage.setItem(REVIEW_KEY, JSON.stringify(reviews));

    const logs = this.logs();
    logs.push({ topic, correct, atMs: nowMs, timeMs, ...(subject ? { subject } : {}) });
    this.storage.setItem(LOG_KEY, JSON.stringify(logs));
    return next;
  }

  /**
   * 科目別の正答率（合格到達度の素地）。subject 付きログのみ集計する。
   * lib/study/lesson.ts の passReadiness にそのまま渡せる形で返す。
   */
  subjectAccuracy(): Array<{ subject: string; accuracy: number; attempts: number }> {
    const m = new Map<string, { correct: number; attempts: number }>();
    for (const l of this.logs()) {
      if (!l.subject) continue;
      const cur = m.get(l.subject) ?? { correct: 0, attempts: 0 };
      cur.attempts += 1;
      if (l.correct) cur.correct += 1;
      m.set(l.subject, cur);
    }
    return [...m.entries()]
      .map(([subject, s]) => ({ subject, accuracy: s.attempts > 0 ? s.correct / s.attempts : 0, attempts: s.attempts }))
      .sort((a, b) => a.accuracy - b.accuracy);
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

  /** 復習期日(dueMs)が到来している topic（間隔反復の復習対象）。 */
  dueTopics(nowMs: number = Date.now()): string[] {
    return [...this.allReviews().entries()].filter(([, s]) => s.dueMs <= nowMs).map(([topic]) => topic);
  }

  /** 直近の解答が不正解だった topic（間違い直し用）。 */
  wrongTopics(): string[] {
    const last = new Map<string, boolean>();
    for (const l of this.logs()) last.set(l.topic, l.correct);
    return [...last.entries()].filter(([, correct]) => !correct).map(([topic]) => topic);
  }

  /** 試験日（epoch ms）。未設定は null。合格逆算のペース計画に使う。 */
  examDateMs(): number | null {
    const raw = this.storage.getItem(EXAM_KEY);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }

  /** 試験日を保存する（"YYYY-MM-DD" or epoch ms）。空文字でクリア。 */
  setExamDate(value: string): void {
    if (!value) {
      this.storage.setItem(EXAM_KEY, "");
      return;
    }
    const ms = /^\d+$/.test(value) ? Number(value) : Date.parse(value);
    if (Number.isFinite(ms)) this.storage.setItem(EXAM_KEY, String(ms));
  }

  /** 今日の解答数（日次目標の達成判定に使う）。 */
  todayAnswered(nowMs: number = Date.now()): number {
    const today = Math.floor(nowMs / DAY_MS);
    return this.logs().filter((l) => Math.floor(l.atMs / DAY_MS) === today).length;
  }
}
