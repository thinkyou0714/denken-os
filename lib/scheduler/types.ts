/** 復習スケジューラ共通型（05-adaptive-diagnosis）。 */

export type Rating = "again" | "hard" | "good" | "easy";

/** 1カード（=1論点/問題）の記憶状態。 */
export interface ReviewState {
  reps: number; // 連続正解回数
  lapses: number; // 失敗回数
  intervalDays: number; // 次回までの間隔（日）
  ease: number; // 易しさ係数（SM-2）
  dueMs: number; // 次回復習予定（epoch ms）
  lastReviewMs: number | null;
}

export interface Scheduler {
  /** 新規カードの初期状態。 */
  init(nowMs?: number): ReviewState;
  /** 採点を反映して次回状態を返す。 */
  review(state: ReviewState, rating: Rating, nowMs?: number): ReviewState;
}

export const DAY_MS = 86_400_000;
