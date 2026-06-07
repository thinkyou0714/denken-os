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
  stability?: number; // FSRS の記憶安定性（日）。SM-2 では未使用。永続化往復で保持する。
  difficulty?: number; // FSRS の難易度。SM-2 では未使用。永続化往復で保持する。
  /**
   * FSRS の学習状態（ts-fsrs State enum: 0=New,1=Learning,2=Review,3=Relearning）。
   * reps から復元すると Learning/Relearning を Review に誤分類し間隔が約10倍に膨らむため、
   * 状態自体を永続化往復で保持する。SM-2 では未使用。
   */
  state?: number;
}

export interface Scheduler {
  /** 新規カードの初期状態。 */
  init(nowMs?: number): ReviewState;
  /** 採点を反映して次回状態を返す。 */
  review(state: ReviewState, rating: Rating, nowMs?: number): ReviewState;
}

export const DAY_MS = 86_400_000;
