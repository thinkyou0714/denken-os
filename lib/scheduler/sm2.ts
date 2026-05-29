/**
 * sm2.ts — SM-2 ベースの軽量スケジューラ（MVP）。
 * インターフェースを切ってあるので、後で FSRS に差し替えられる
 * (05-adaptive-diagnosis: 「MVP は SM-2 でも可。後で FSRS に差替え可能に」)。
 */
import { DAY_MS, type Rating, type ReviewState, type Scheduler } from "./types.js";

const MIN_EASE = 1.3;

function qualityOf(rating: Rating): number {
  switch (rating) {
    case "again":
      return 1;
    case "hard":
      return 3;
    case "good":
      return 4;
    case "easy":
      return 5;
  }
}

export class Sm2Scheduler implements Scheduler {
  init(nowMs: number = Date.now()): ReviewState {
    return { reps: 0, lapses: 0, intervalDays: 0, ease: 2.5, dueMs: nowMs, lastReviewMs: null };
  }

  review(state: ReviewState, rating: Rating, nowMs: number = Date.now()): ReviewState {
    const q = qualityOf(rating);
    let { reps, lapses, intervalDays, ease } = state;

    if (q < 3) {
      // 不正解: 連続正解リセット・即再出題（間隔を縮める）。
      reps = 0;
      lapses += 1;
      intervalDays = 0; // 当日中に再出題
    } else {
      reps += 1;
      if (reps === 1) intervalDays = 1;
      else if (reps === 2) intervalDays = 6;
      else intervalDays = Math.round(intervalDays * ease);
    }

    // SM-2 の ease 更新式。
    ease = ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
    if (ease < MIN_EASE) ease = MIN_EASE;

    return {
      reps,
      lapses,
      intervalDays,
      ease: Number(ease.toFixed(4)),
      dueMs: nowMs + intervalDays * DAY_MS,
      lastReviewMs: nowMs,
    };
  }
}
