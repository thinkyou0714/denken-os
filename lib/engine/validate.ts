/**
 * validate.ts — 問題データの検証。
 *
 * 二段構え (problem-schema.json の $comment / 09-ci-quality-gate.md の役割分担):
 *  1) 構造検証: zod (problem-schema.json のミラー)
 *  2) コード側不変条件: draft-07 で表現できない「answer ∈ choices」等
 *
 * ε: ANSWER_EPSILON は clean.ts が提供する定数（G1 との契約）。
 * G1 完了前にこのファイルを参照する場合は型エラーになりうるが、
 * wave 終了時にオーケストレータが統合検証する。
 *
 * ## validateProblemSet（II-115）
 * `validateProblemSet(problems)` で問題セット全体の酷似パラメータ（実質重複）を検出する。
 * 純関数・既存 generate には組み込まず、提供のみ。
 */
import { ANSWER_EPSILON, isCleanAnswer } from "./clean.js";
import { type Problem, problemSchema } from "./schema.js";

export interface ValidationIssue {
  rule: string;
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  issues: ValidationIssue[];
  problem?: Problem;
}

/** multiple_choice のとき answer が choices のいずれかと一致するか。 */
export function answerInChoices(p: Problem): boolean {
  if (p.format !== "multiple_choice") return true;
  if (!p.choices) return false;
  return p.choices.includes(p.answer);
}

/** answer が「綺麗な値」か（数値として解釈できるとき）。非数値（記述式等）は true。 */
export function answerIsClean(p: Problem): boolean {
  const n = Number(p.answer);
  if (Number.isNaN(n)) return true;
  return isCleanAnswer(n);
}

/**
 * 1件を完全検証する。構造(zod) → コード側不変条件 の順に積み上げる。
 */
export function validateProblem(input: unknown): ValidationResult {
  const issues: ValidationIssue[] = [];

  const parsed = problemSchema.safeParse(input);
  if (!parsed.success) {
    for (const e of parsed.error.issues) {
      issues.push({ rule: "schema", message: `${e.path.join(".")}: ${e.message}` });
    }
    return { ok: false, issues };
  }

  const p = parsed.data;

  if (!answerInChoices(p)) {
    issues.push({
      rule: "answer_in_choices",
      message: `answer "${p.answer}" が choices に含まれていません`,
    });
  }

  if (p.validation.clean_answer && !answerIsClean(p)) {
    issues.push({
      rule: "clean_answer",
      message: `clean_answer=true だが answer "${p.answer}" は綺麗な値ではありません`,
    });
  }

  return { ok: issues.length === 0, issues, problem: p };
}

/**
 * 問題セット全体の酷似パラメータ（実質重複）を検出する（II-115）。
 *
 * 同一 topic 内で全数値パラメータが `PARAM_SIMILARITY_THRESHOLD` 以内に収まる問題を
 * 「酷似」とみなし、`ValidationIssue` として報告する。純関数。
 * 既存の generate には組み込まず、セット全体のポストバリデーションとして提供する。
 *
 * @param problems - 検査対象の問題セット（validateProblem を通過した Problem[]）
 * @param threshold - 各パラメータ値の相対誤差許容範囲（既定: 1e-6 = 実質同一）
 * @returns 酷似ペアごとの ValidationIssue リスト（空 = 問題なし）
 *
 * 使用例:
 * ```ts
 * const issues = validateProblemSet(problems);
 * if (issues.length > 0) console.warn("重複問題検出:", issues);
 * ```
 */
export const PARAM_SIMILARITY_THRESHOLD = 1e-6;

export function validateProblemSet(problems: Problem[], threshold = PARAM_SIMILARITY_THRESHOLD): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // topic ごとにグループ化
  const byTopic = new Map<string, Problem[]>();
  for (const p of problems) {
    const group = byTopic.get(p.topic) ?? [];
    group.push(p);
    byTopic.set(p.topic, group);
  }

  for (const [topic, group] of byTopic) {
    // 数値パラメータを持つ問題のみ比較（filter で params の存在は確認済み）
    const withParams = group.filter((p) => p.params && Object.keys(p.params).length > 0);
    for (let i = 0; i < withParams.length - 1; i++) {
      const a = withParams[i];
      if (!a) continue;
      for (let j = i + 1; j < withParams.length; j++) {
        const b = withParams[j];
        if (!b) continue;
        // filter で params 存在を確認済みだが、型システム上 undefined 可能なため空オブジェクトにフォールバック
        const aParams = a.params ?? {};
        const bParams = b.params ?? {};
        if (areSimilarParams(aParams, bParams, threshold)) {
          issues.push({
            rule: "duplicate_params",
            message: `topic="${topic}" 内で問題 ${a.id} と ${b.id} のパラメータが酷似しています（相対誤差 ≤ ${threshold}）`,
          });
        }
      }
    }
  }

  return issues;
}

/**
 * 2問のパラメータが「酷似」しているか判定する（validateProblemSet のヘルパー）。
 * キーセットが同一で、全値の相対誤差が threshold 以内のとき true。
 */
function areSimilarParams(
  a: NonNullable<Problem["params"]>,
  b: NonNullable<Problem["params"]>,
  threshold: number,
): boolean {
  const keysA = Object.keys(a).sort();
  const keysB = Object.keys(b).sort();
  if (keysA.length !== keysB.length) return false;
  if (keysA.some((k, i) => k !== keysB[i])) return false;

  for (const key of keysA) {
    const va = a[key]?.value;
    const vb = b[key]?.value;
    if (va === undefined || vb === undefined) return false;
    // ゼロ同士はそのまま同一とみなす。それ以外は相対誤差。
    const denom = Math.max(Math.abs(va), Math.abs(vb), Number.EPSILON);
    if (Math.abs(va - vb) / denom > threshold) return false;
  }
  return true;
}

/**
 * 解説テキストから「最終的な答え」を取り出し、想定値と一致するか確認する。
 * narrate.ts が出した解説の数値整合チェック（不一致なら generate 側で破棄）。
 *
 * 数値抽出正規表現:
 *  - 指数表記 (1.5e3, 2E-4) に対応（I-013 拡張）。
 *  - 符号付き数値 (-5.0, +3) にも対応。
 *  - 既存の受理挙動は維持し、受理範囲を広げる方向の拡張のみ行う。
 *
 * 受理が広がった例:
 *  - "電流 I=1.5e3A" → 1500 として answerText="1500" と照合できるようになった。
 *  - "+3.2" のように符号付き数値も数値として抽出できるようになった。
 *  - "2.56E-4" の大文字 E 指数表記も受理。
 */
export function narrationMatchesAnswer(solution: string[], answerText: string): boolean {
  const expected = Number(answerText);
  if (Number.isNaN(expected)) {
    // 非数値の答えは、最終ステップに answerText が現れることを要求。
    return solution.some((s) => s.includes(answerText));
  }
  // 解説全体から数値を抽出し、想定値に十分近いものが含まれるか。
  // 指数表記（1.5e3, 2E-4 など）にも対応した正規表現（I-013）。
  const nums =
    solution
      .join(" ")
      .match(/[+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g)
      ?.map(Number) ?? [];
  return nums.some((n) => Math.abs(n - expected) < ANSWER_EPSILON);
}
