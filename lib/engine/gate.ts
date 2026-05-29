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
 * 監修が必須となる問題か（03-quality-pipeline「重要論点は二重チェック」）。
 * - 二種二次の記述(descriptive): 論述の正しさは人の判断が要るため監修必須。
 * - difficulty>=4 の重要・難問: 誤りが致命的なため監修必須。
 * - 過去問引用(past_exam_quoted): 原典確認のため監修対象。
 */
export function requiresSupervision(p: Problem): boolean {
  if (p.exam === "denken2_secondary" && p.format === "descriptive") return true;
  if (p.difficulty >= 4) return true;
  if (p.source.type === "past_exam_quoted") return true;
  return false;
}

/**
 * 「公開(published)」してよいかの最終ゲート。
 * 検証4項目に加え、監修必須の問題は supervisor_checked=true を要求する。
 * published は対外配信（X・アプリの監修済みバッジ）に使う最上位の状態。
 */
export function canPublish(p: Problem): boolean {
  if (!meetsValidationGate(p.validation)) return false;
  if (requiresSupervision(p) && p.validation.supervisor_checked !== true) return false;
  return true;
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
