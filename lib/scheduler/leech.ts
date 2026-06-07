/**
 * leech.ts — 「何度やっても忘れる」論点(leech)の検出。
 * ReviewState.lapses は SM-2/FSRS とも追跡・永続化済だが診断で未使用だった。
 * Anki 慣行(lapse>=8 で leech)に倣い、復習キューを支配する leech を可視化/隔離するための純関数。
 */
import type { ReviewState } from "./types.js";

export interface LeechPolicy {
  /** これ以上 lapse したら leech とみなす閾値（Anki 既定 8）。 */
  lapseThreshold: number;
}

export const DEFAULT_LEECH_POLICY: LeechPolicy = { lapseThreshold: 8 };

export type LeechSeverity = "none" | "leech" | "severe";

/** lapse 回数が閾値以上なら leech。 */
export function isLeech(s: Pick<ReviewState, "lapses">, policy: LeechPolicy = DEFAULT_LEECH_POLICY): boolean {
  return s.lapses >= policy.lapseThreshold;
}

/** none / leech / severe(閾値の2倍以上) の3段階。隔離や強調表示の出し分けに使う。 */
export function leechSeverity(
  s: Pick<ReviewState, "lapses">,
  policy: LeechPolicy = DEFAULT_LEECH_POLICY,
): LeechSeverity {
  if (s.lapses >= policy.lapseThreshold * 2) return "severe";
  if (s.lapses >= policy.lapseThreshold) return "leech";
  return "none";
}
