/**
 * rating.ts — 正誤 + 解答時間から4段階 Rating を導く（SCHED-4LEVEL-RATING）。
 * record() は従来 correct→good / incorrect→again の2値しか発行せず、両スケジューラが
 * サポートする hard/easy が dead path だった。計測済みだが未使用の timeMs を使い、
 * 速い正解=easy（間隔を伸ばす）/ 遅い正解=hard（短く）に振り分けて SM-2・FSRS を活かす。
 */
import type { Rating } from "./types.js";

export function deriveRating(correct: boolean, timeMs?: number, fastMs = 8000, slowMs = 25000): Rating {
  if (!correct) return "again";
  if (timeMs === undefined) return "good";
  if (timeMs < fastMs) return "easy";
  if (timeMs > slowMs) return "hard";
  return "good";
}
