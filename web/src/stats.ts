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
  /** お守り・おやすみ予約が欠席をカバーした回数。 */
  freezeSaves: number;
  /** 1日の最多解答数（自己ベスト）。 */
  bestDayCount: number;
  /** 歴代最長ストリーク（現在途切れていても過去のベストを称える）。 */
  bestStreakEver: number;
}

/** 日集合の中の最長連続日数（歴代最長ストリーク）。 */
export function longestStreak(days: ReadonlySet<number>): number {
  let best = 0;
  for (const d of days) {
    if (days.has(d - 1)) continue; // 連続の先頭だけから数える（O(n)）
    let len = 1;
    while (days.has(d + len)) len += 1;
    if (len > best) best = len;
  }
  return best;
}

/** 解答ログ（とお守り消費日・おやすみ予約日）から自己ベスト統計を導出する。 */
export function myStats(
  logs: readonly WebAnswerLog[],
  usedFreezeDays: readonly number[],
  restDays: readonly number[] = [],
): MyStats {
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
  // 歴代最長ストリークは肩代わり日（お守り・おやすみ）も連続として数える。
  const allDays = new Set(dayIdxs);
  for (const d of usedFreezeDays) allDays.add(d);
  for (const d of restDays) allDays.add(d);
  return {
    studyDays: dayIdxs.length,
    questClearDays,
    bestCombo,
    perfectDays: perfectDayCount(logs),
    topicsStudied: new Set(logs.map((l) => l.topic)).size,
    freezeSaves: usedFreezeDays.length,
    bestDayCount,
    bestStreakEver: longestStreak(allDays),
  };
}

/** 論点マスターの既定条件: 「余裕（easy）」評価をこの回数つけたらマスター。 */
export const MASTER_EASY_COUNT = 3;

/**
 * マスター済み論点（easy 評価が規定回数に達した topic）。
 * 「覚えた」をユーザー自身の自己評価から認定する＝学習の質に直結する誇り。
 */
export function masteredTopics(logs: readonly WebAnswerLog[], minEasy: number = MASTER_EASY_COUNT): string[] {
  const easyCount = new Map<string, number>();
  for (const l of logs) {
    if (l.rating === "easy") easyCount.set(l.topic, (easyCount.get(l.topic) ?? 0) + 1);
  }
  return [...easyCount.entries()]
    .filter(([, n]) => n >= minEasy)
    .sort((a, b) => b[1] - a[1])
    .map(([topic]) => topic);
}

export interface GhostRace {
  /** 今日の獲得XP。 */
  today: number;
  /** 直近7日（今日を除く）の平均XP（学習しなかった日も0として含む）。 */
  avg: number;
  /** 今日が自己平均を超えているか。 */
  beat: boolean;
}

/**
 * ゴーストレース: 「過去7日の自分」と今日のXPで競う。
 * 他人とのリーグはサーバ必須だが、自己平均超えはオフラインで成立する競争。
 * @param xpDays xpByDay(logs, 8, now) の結果（古い順8要素・最後が今日）
 */
export function ghostRace(xpDays: readonly number[]): GhostRace {
  if (xpDays.length === 0) return { today: 0, avg: 0, beat: false };
  // xpDays.length === 0 を直前でチェック済みのため xpDays[length - 1] は存在する。
  const today = xpDays[xpDays.length - 1] as number;
  const past = xpDays.slice(0, -1);
  const avg = past.length > 0 ? past.reduce((a, b) => a + b, 0) / past.length : 0;
  return { today, avg: Math.round(avg), beat: today > avg && avg >= 0 && today > 0 };
}
