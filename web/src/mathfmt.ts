/**
 * mathfmt.ts — 数式の軽量フォーマッタ（純ロジック）。
 *
 * 方針: 電験の解説は電気量（V_p, I_l, R²）を多用するが、プレーンテキストでは
 *   下付き・上付きが潰れて読みにくい。オフライン/最小依存の方針を守るため
 *   KaTeX 等は使わず、HTML エスケープ後に下付き(_)・上付き(^)だけを安全に整形する。
 *   Unicode の上付き(²³⁻)・√・ギリシャ文字はそのまま表示する。
 */

const ESCAPE: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(s: string): string {
  // regex が ESCAPE のキー集合 /[&<>"']/ に完全一致するため ESCAPE[c] は常に存在する。
  return s.replace(/[&<>"']/g, (c) => ESCAPE[c] as string);
}

/**
 * 既にエスケープ済みの文字列に下付き/上付きのマークアップだけを適用する（エスケープしない）。
 *  - `^{...}` / `^x` → <sup>、`_{...}` / `_x` → <sub>
 *  下付き/上付きの対象は英数字（V_p, P_out, x^2 等）に限定し、誤変換を避ける。
 * Markdown レンダラー（escape 済み）から再エスケープせずに数式整形を重ねるために分離。
 */
export function applyMathMarkup(escaped: string): string {
  let s = escaped.replace(/\^\{([^}]+)\}/g, "<sup>$1</sup>");
  s = s.replace(/\^([0-9A-Za-z]+)/g, "<sup>$1</sup>");
  s = s.replace(/_\{([^}]+)\}/g, "<sub>$1</sub>");
  s = s.replace(/_([0-9A-Za-z]+)/g, "<sub>$1</sub>");
  return s;
}

/**
 * テキストを安全な HTML に整形する。
 *  - まず HTML エスケープ（XSS 防止）
 *  - `^{...}` / `^x` → <sup>、`_{...}` / `_x` → <sub>
 *  下付き/上付きの対象は英数字（V_p, P_out, x^2 等）に限定し、誤変換を避ける。
 */
export function formatMath(raw: string): string {
  return applyMathMarkup(escapeHtml(raw));
}
