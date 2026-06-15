/** 復習スケジューラ共通型（05-adaptive-diagnosis）。 */

export type Rating = "again" | "hard" | "good" | "easy";

// DAY_MS は lib/shared/time.ts に一元化。後方互換のため re-export する。
export { DAY_MS } from "../shared/time.js";

/** 1カード（=1論点/問題）の記憶状態。 */
export interface ReviewState {
  reps: number; // 連続正解回数
  lapses: number; // 失敗回数
  intervalDays: number; // 次回までの間隔（日）
  ease: number; // 易しさ係数（SM-2）
  dueMs: number; // 次回復習予定（epoch ms）
  lastReviewMs: number | null;
  /**
   * 状態の生成時刻（epoch ms）。後方互換のため optional（II-141）。
   * 古い永続化データは undefined になるが、init() で生成した新規状態は必ず設定される。
   * 用途: 長期未レビューの状態（古い参照）を検出し誤参照リスクを低減する。
   */
  createdAtMs?: number;
}

export interface Scheduler {
  /** 新規カードの初期状態。 */
  init(nowMs?: number): ReviewState;
  /** 採点を反映して次回状態を返す。 */
  review(state: ReviewState, rating: Rating, nowMs?: number): ReviewState;
}
