/**
 * stats.ts — 「自分の記録」統計（純ロジック）。
 *
 * 他人とのランキング（リーグ）はサーバが必要だが、**自己ベストとの比較**は
 * オフラインで成立し、しかも他人比較より健全な動機になる（自己決定理論の
 * 有能感に効く）。解答ログ＋お守り履歴から、誇れる数字を導出して見せる。
 * DOM 非依存でテスト可能。日境界は JST。
 */
import {
  allQuestsClear,
  dayIndexOf,
  JST_OFFSET_MS,
  logsOfDay,
  maxConsecutiveCorrect,
  perfectDayCount,
} from "./quests.js";
import type { WebAnswerLog } from "./store.js";

export interface MyStats {
  /** 学習した日数（ユニーク日）。 */
  studyDays: number;
  /** デイリークエストを全達成した日数。 */
  questClearDays: number;
  /** 過去最高の連続正解（全期間・日内）。 */
  bestCombo: number;
  /** パーフェクトデー（5問以上全問正解）の回数。 */
  perfectDays: number;
  /** これまでに挑戦した論点の種類。 */
  topicsStudied: number;
  /** お守りが欠席をカバーした回数。 */
  freezeSaves: number;
  /** 1日の最多解答数（自己ベスト）。 */
  bestDayCount: number;
}

/** 解答ログ（とお守り消費履歴）から自己ベスト統計を導出する。 */
export function myStats(logs: readonly WebAnswerLog[], usedFreezeDays: readonly number[]): MyStats {
  const dayIdxs = [...new Set(logs.map((l) => dayIndexOf(l.atMs, JST_OFFSET_MS)))];
  let questClearDays = 0;
  let bestCombo = 0;
  let bestDayCount = 0;
  for (const d of dayIdxs) {
    const dayLogs = logsOfDay(logs, d);
    if (allQuestsClear(dayLogs, d)) questClearDays += 1;
    bestCombo = Math.max(bestCombo, maxConsecutiveCorrect(dayLogs));
    bestDayCount = Math.max(bestDayCount, dayLogs.length);
  }
  return {
    studyDays: dayIdxs.length,
    questClearDays,
    bestCombo,
    perfectDays: perfectDayCount(logs),
    topicsStudied: new Set(logs.map((l) => l.topic)).size,
    freezeSaves: usedFreezeDays.length,
    bestDayCount,
  };
}
