/**
 * gate.ts — status 遷移の門番。
 * status=validated/published にできるのは検証4項目がすべて true のときだけ
 * (problem-schema.json の allOf / 03-quality-pipeline の足切り)。
 */
import type { Problem, ProblemStatus } from "./schema.js";

export interface ValidationFlags {
  solver_checked: boolean;
  human_checked: boolean;
  clean_answer: boolean;
  physically_valid: boolean;
}

/** 検証4項目がすべて true か。 */
export function meetsValidationGate(v: ValidationFlags): boolean {
  return v.solver_checked && v.human_checked && v.clean_answer && v.physically_valid;
}

/** confidence の足切り（閾値未満は出題しない）。 */
export function meetsConfidence(p: Problem, threshold: number): boolean {
  return (p.validation.confidence ?? 0) >= threshold;
}

/**
 * 要求された status へ昇格してよいか判定する。
 * - validated/published を要求しても4項目が揃わなければ昇格させず draft に留める。
 * - 人の目(human_checked)が未了なら自動では validated にできない（人間の承認ゲート）。
 */
export function decideStatus(v: ValidationFlags, requested: ProblemStatus): ProblemStatus {
  if ((requested === "validated" || requested === "published") && !meetsValidationGate(v)) {
    return "draft";
  }
  return requested;
}
