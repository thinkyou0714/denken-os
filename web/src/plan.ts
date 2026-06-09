/**
 * plan.ts — 試験カウントダウンと日次学習計画（純ロジック）。
 * 学習科学の定石: 直前の詰め込みより毎日の分散学習。試験日から逆算して
 * 「1日あたり何問」「合格までの残り日数」を提示し、継続を後押しする。
 */

const DAY_MS = 86_400_000;

export interface StudyPlan {
  daysLeft: number; // 試験まで残り日数（過ぎていれば 0）
  weeksLeft: number;
  recommendedPerDay: number; // 全範囲を試験までに2巡する目安
  todayCount: number; // 今日解いた数
  dailyGoal: number; // 設定上の1日目標
  metToday: boolean; // 今日の目標達成済みか
}

/** ISO 日付(YYYY-MM-DD)と現在時刻から残り日数を返す（JST の暦日で概算）。 */
export function daysUntil(examDateIso: string, nowMs: number = Date.now()): number {
  const exam = Date.parse(`${examDateIso}T00:00:00+09:00`);
  if (Number.isNaN(exam)) return 0;
  const jstNowDay = Math.floor((nowMs + 9 * 3600_000) / DAY_MS);
  const jstExamDay = Math.floor((exam + 9 * 3600_000) / DAY_MS);
  return Math.max(0, jstExamDay - jstNowDay);
}

/**
 * 学習計画を組み立てる。
 *  - recommendedPerDay = ceil(全問題数 × 2巡 / 残り日数)（試験までに2周する目安）
 */
export function buildStudyPlan(input: {
  examDateIso: string;
  totalProblems: number;
  todayCount: number;
  dailyGoal: number;
  nowMs?: number;
}): StudyPlan {
  const nowMs = input.nowMs ?? Date.now();
  const daysLeft = daysUntil(input.examDateIso, nowMs);
  const passes = 2;
  const recommendedPerDay = daysLeft > 0 ? Math.ceil((input.totalProblems * passes) / daysLeft) : input.totalProblems;
  return {
    daysLeft,
    weeksLeft: Math.ceil(daysLeft / 7),
    recommendedPerDay,
    todayCount: input.todayCount,
    dailyGoal: input.dailyGoal,
    metToday: input.todayCount >= input.dailyGoal,
  };
}
