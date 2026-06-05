/**
 * grade.ts — 採点の純ロジック（app.ts の DOM から分離してテスト可能にする）。
 *
 * 重要な是正（根本原因）:
 *   旧実装は numeric 形式でも `given === answer` の文字列完全一致で採点していた。
 *   そのため "50" の問題に "50.0"／"50"（全角）／"  50 " と入力すると数値的には
 *   正解でも不正解になっていた。numeric は数値として許容誤差つきで比較する。
 *   multiple_choice / descriptive は選択肢・センチネルの厳密一致でよい。
 */
import type { Problem } from "../../lib/engine/schema.js";

/**
 * ユーザー入力を数値文字列に正規化する。
 * - 全角数字 ０-９ → 半角 0-9
 * - 全角ピリオド／読点・句点を小数点・桁区切りに寄せる
 * - 桁区切りカンマ・空白を除去
 */
export function normalizeNumericInput(raw: string): string {
  return raw
    .replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xfee0))
    .replace(/[．。]/g, ".")
    .replace(/[，、]/g, ",")
    .replace(/,/g, "")
    .replace(/\s+/g, "")
    .trim();
}

/**
 * numeric は数値の許容誤差比較、その他（multiple_choice / descriptive）は厳密一致。
 * 許容誤差は「綺麗な値（小数2桁）」前提で相対 1e-6（浮動小数の表記揺れ吸収）。
 */
export function isAnswerCorrect(problem: Problem, given: string): boolean {
  if (problem.format === "numeric") {
    const got = Number(normalizeNumericInput(given));
    const want = Number(problem.answer);
    if (!Number.isFinite(got) || !Number.isFinite(want)) return false;
    const tol = Math.max(1e-9, Math.abs(want) * 1e-6);
    return Math.abs(got - want) <= tol;
  }
  // multiple_choice の選択肢、descriptive の自己採点センチネルは厳密一致。
  return given === problem.answer;
}
