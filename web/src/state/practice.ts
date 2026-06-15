/**
 * state/practice.ts — 学習タブの状態。
 * practice オブジェクト・combo・hints・practicePool / weakTopics / todayCount。
 *
 * II-153: combo/hintsShown はタブ切替でリセットされず、session 内で保持される。
 * 明示的にリセットしたい場合は resetPracticeSession() を呼ぶ。
 * setCombo()/setHintsShown() は RG6（views 層）が呼び出す。
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

// ---- II-153/II-174: practice state setter API ----
// views 層（RG6）はこれらの setter を通じて状態を更新する。
// タブ切替では practice オブジェクトの参照が維持されるため、
// 明示的なリセットなしに combo/hintsShown がセッション内で保持される。

/** セッション内の連続正解数を更新する（タブ切替で消えない）。 */
export function setCombo(n: number): void {
  practice.combo = Math.max(0, Math.floor(n));
}

/** 現在の問題でのヒント開示段数を更新する（タブ切替で消えない）。 */
export function setHintsShown(n: number): void {
  practice.hintsShown = Math.max(0, Math.floor(n));
}

/** 採点完了・新問題開始時に combo/hintsShown を明示リセットする。 */
export function resetPracticeSession(): void {
  practice.combo = 0;
  practice.hintsShown = 0;
}

/** 現在の問題を設定し、hintsShown をリセットする（新問題表示時に呼ぶ）。 */
export function setPracticeCurrent(problem: Problem | null, shownAt: number = Date.now()): void {
  practice.current = problem;
  practice.shownAt = shownAt;
  practice.hintsShown = 0;
}

/** 弱点論点 TOP3（ストア依存のため関数で提供）。 */
export function weakTopics(): string[] {
  return weakestTopics(aggregateByTopic(progress.logs()).values(), Date.now(), 3);
}

/** 今日（JST日基準）の解答数。日次目標の達成判定に使う。 */
export function todayCount(): number {
  return progress.logs().filter((l) => sameJstDay(l.atMs, Date.now())).length;
}
