/**
 * dashboard.ts — 進捗ダッシュボードの集計（純ロジック）。
 * 解答ログ・FSRS カードビュー・問題集から、科目別/論点別の到達度や
 * 復習見込みを算出する。DOM 非依存でテスト可能。
 */
import type { Problem, Subject } from "../../lib/engine/schema.js";
import type { FsrsView } from "../../lib/scheduler/fsrs.js";
import type { WebAnswerLog } from "./store.js";

export interface Tally {
  attempts: number;
  correct: number;
  accuracy: number; // 0..1（attempts=0 のとき 0）
}

export interface SubjectRow extends Tally {
  subject: Subject;
}

export type Mastery = "未学習" | "要復習" | "習得中" | "習得";

const DAY_MS = 86_400_000;

function tally(attempts: number, correct: number): Tally {
  return { attempts, correct, accuracy: attempts > 0 ? correct / attempts : 0 };
}

/** 問題集から topic→subject の対応表を作る。 */
export function topicSubjectMap(problems: Problem[]): Map<string, Subject> {
  const m = new Map<string, Subject>();
  for (const p of problems) if (!m.has(p.topic)) m.set(p.topic, p.subject);
  return m;
}

/** 全体集計。 */
export function overall(logs: WebAnswerLog[]): Tally & { topicsStudied: number } {
  let correct = 0;
  const topics = new Set<string>();
  for (const l of logs) {
    if (l.correct) correct += 1;
    topics.add(l.topic);
  }
  return { ...tally(logs.length, correct), topicsStudied: topics.size };
}

/** 直近 n 件の正答率。 */
export function recentAccuracy(logs: WebAnswerLog[], n = 20): number {
  const recent = logs.slice(-n);
  if (recent.length === 0) return 0;
  return recent.filter((l) => l.correct).length / recent.length;
}

/** 科目別集計（解いていない科目は attempts=0 で含める）。 */
export function bySubject(logs: WebAnswerLog[], problems: Problem[]): SubjectRow[] {
  const map = topicSubjectMap(problems);
  const order: Subject[] = ["理論", "電力", "機械", "法規", "電力管理", "機械制御"];
  const acc = new Map<Subject, { attempts: number; correct: number }>();
  for (const s of order) acc.set(s, { attempts: 0, correct: 0 });
  for (const l of logs) {
    const subject = map.get(l.topic);
    if (!subject) continue;
    const cur = acc.get(subject);
    if (!cur) continue;
    cur.attempts += 1;
    if (l.correct) cur.correct += 1;
  }
  return order.map((subject) => ({ subject, ...tally(acc.get(subject)!.attempts, acc.get(subject)!.correct) }));
}

/** 論点別集計（正答率の低い順 = 弱点順）。 */
export function byTopic(logs: WebAnswerLog[]): Array<Tally & { topic: string; lastMs: number }> {
  const acc = new Map<string, { attempts: number; correct: number; lastMs: number }>();
  for (const l of logs) {
    const cur = acc.get(l.topic) ?? { attempts: 0, correct: 0, lastMs: 0 };
    cur.attempts += 1;
    if (l.correct) cur.correct += 1;
    cur.lastMs = Math.max(cur.lastMs, l.atMs);
    acc.set(l.topic, cur);
  }
  return [...acc.entries()]
    .map(([topic, v]) => ({ topic, lastMs: v.lastMs, ...tally(v.attempts, v.correct) }))
    .sort((a, b) => a.accuracy - b.accuracy || b.attempts - a.attempts);
}

/** 到達度の判定（正答率と試行回数から）。 */
export function masteryLevel(t: Tally): Mastery {
  if (t.attempts === 0) return "未学習";
  if (t.attempts < 3 || t.accuracy < 0.6) return "要復習";
  if (t.accuracy < 0.85) return "習得中";
  return "習得";
}

/** 既定の日境界は日本標準時(UTC+9)。store.ts / plan.ts と揃え、「今日/明日」のズレを防ぐ。 */
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 今後 days 日の復習予定件数（カードの due を日別に集計）。index0=今日（JST 日境界）。 */
export function reviewForecast(
  views: Iterable<FsrsView>,
  nowMs: number,
  days = 7,
  dayOffsetMs: number = JST_OFFSET_MS,
): number[] {
  const out = new Array<number>(days).fill(0);
  const todayIdx = Math.floor((nowMs + dayOffsetMs) / DAY_MS);
  for (const v of views) {
    const diff = Math.floor((v.dueMs + dayOffsetMs) / DAY_MS) - todayIdx;
    const bucket = diff < 0 ? 0 : diff; // 期限超過は今日に算入
    if (bucket < days) out[bucket] = (out[bucket] ?? 0) + 1;
  }
  return out;
}
