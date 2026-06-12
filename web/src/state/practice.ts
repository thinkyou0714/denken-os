/**
 * state/practice.ts — 学習タブの状態。
 * practice オブジェクト・combo・hints・practicePool / weakTopics / todayCount。
 */
import type { Problem, Subject } from "../../../lib/engine/schema.js";
import { aggregateByTopic, weakestTopics } from "../../../lib/scheduler/diagnosis.js";
import { sameJstDay } from "../dates.js";
import { progress } from "./app.js";

/** 学習タブのランタイム状態。 */
export const practice: {
  current: Problem | null;
  shownAt: number;
  pool: Problem[] | null;
  subject: Subject | "all";
  /** 現在の問題で開示したヒント段数（0=未使用）。 */
  hintsShown: number;
  /** セッション内の連続正解数（不正解・ドリル開始でリセット）。 */
  combo: number;
} = {
  current: null,
  shownAt: 0,
  pool: null,
  subject: "all",
  hintsShown: 0,
  combo: 0,
};

/** 弱点論点 TOP3（ストア依存のため関数で提供）。 */
export function weakTopics(): string[] {
  return weakestTopics(aggregateByTopic(progress.logs()).values(), Date.now(), 3);
}

/** 今日（JST日基準）の解答数。日次目標の達成判定に使う。 */
export function todayCount(): number {
  return progress.logs().filter((l) => sameJstDay(l.atMs, Date.now())).length;
}
