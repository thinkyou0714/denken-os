/**
 * validate.ts — 問題データの検証。
 *
 * 二段構え (problem-schema.json の $comment / 09-ci-quality-gate.md の役割分担):
 *  1) 構造検証: zod (problem-schema.json のミラー)
 *  2) コード側不変条件: draft-07 で表現できない「answer ∈ choices」等
 */
import { isCleanAnswer } from "./clean.js";
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
 * 言い換え後の問題文が「与件（既定問題文の数値）」を保存しているか検証する。
 * narrate の LLM が statement を言い換える際に与えられた数値（例 100kW→120kW）を
 * 改変/欠落すると、答えはコード算出のまま統一文と食い違い、解けない/誤った問題になる。
 * narrationMatchesAnswer は「解説の最終値」しか見ないためここを別に守る（反ハルシネーションの核）。
 * 既定文に現れた各数値が、言い換え後の文にも（語境界で）現れることを要求する。
 */
export function narrationPreservesGivens(defaultStatement: string, statement: string): boolean {
  const givens = defaultStatement.match(/-?\d+(?:\.\d+)?/g) ?? [];
  for (const g of givens) {
    const esc = g.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // 数字の一部（100 が 1000 に化ける等）を誤って一致とみなさないよう前後を非数字・非ドットに限定。
    const boundaried = new RegExp(`(^|[^\\d.])${esc}([^\\d.]|$)`);
    if (!boundaried.test(statement)) return false;
  }
  return true;
}

/**
 * 解説テキストから「最終的な答え」を取り出し、想定値と一致するか確認する。
 * narrate.ts が出した解説の数値整合チェック（不一致なら generate 側で破棄）。
 */
export function narrationMatchesAnswer(solution: string[], answerText: string): boolean {
  const expected = Number(answerText);
  if (Number.isNaN(expected)) {
    // 非数値の答え: 部分文字列ではなく語境界で一致を要求（'4.6' が '14.65' に誤マッチしない。DI-2）。
    const esc = answerText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const boundaried = new RegExp(`(^|[^\\w.])${esc}([^\\w.]|$)`);
    return solution.some((s) => boundaried.test(s));
  }
  // 数値の答え: 「途中に正解値が現れる」では不可。結論の最終値が一致するかを見る（F1/DI-1）。
  // ハルシネーションで最終ステップだけ別値にすり替わる事故を、最終値アンカーで検出する。
  // 各ステップの最後の "=" 以降が「先頭が数値で、後続に別の数値を含まない（＝計算式ではなく結果値）」
  // のものを結論値とみなし、その最後＝結論値が想定値に一致するかを判定する。
  // 「式か否か」は第2オペランド（別の数字）の有無で見る。こうすると単位に演算子記号を含む
  // 結果値（m/s・rad/s・A/m・N·m 等の 電験単位）を式と誤認して弱い全走査に落ちるのを防げる。
  let finalResult: number | undefined;
  for (const step of solution) {
    if (!step.includes("=")) continue;
    const tail = step.slice(step.lastIndexOf("=") + 1).trim();
    const m = tail.match(/^(-?\d+(?:\.\d+)?)(.*)$/s);
    if (m && !/\d/.test(m[2] ?? "")) finalResult = Number(m[1]); // 後勝ち＝最後の結果値が結論
  }
  if (finalResult !== undefined) return Math.abs(finalResult - expected) < 1e-6;
  // 「=」純結果が無い異常系のみ、従来の全走査にフォールバック（弱い保証）。
  const nums =
    solution
      .join(" ")
      .match(/-?\d+(?:\.\d+)?/g)
      ?.map(Number) ?? [];
  return nums.some((n) => Math.abs(n - expected) < 1e-6);
}
