/**
 * problem-meta.ts — 問題のメタ情報に関する純ロジック（#63）。
 *
 * 自動生成された未監修の問題を学習者に明示するための判定。透明性を担保し、
 * 「人手で検証されていない可能性がある」ことを UI でバッジ表示する根拠にする。
 */
import type { Problem } from "../../lib/engine/schema.js";

/**
 * 未監修（draft / 人手未検証）の問題か（#63）。
 * status が validated/published 以外、または human_checked / supervisor_checked が
 * 立っていない問題は「未監修」とみなす（自動生成の素案を学習者に明示する）。
 */
export function isUnsupervised(p: Problem): boolean {
  const v = p.validation;
  const humanOk = v.human_checked === true || v.supervisor_checked === true;
  const statusOk = p.status === "validated" || p.status === "published";
  // 監修済みと言えるのは「ステータスが確定」かつ「人手チェック済み」のときだけ。
  return !(statusOk && humanOk);
}
