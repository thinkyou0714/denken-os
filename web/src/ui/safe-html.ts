/**
 * ui/safe-html.ts — sanitize済みHTML文字列の branded type（II-169）。
 * DOM 非依存の純ロジックのみ（node 環境のテストから import 可能にするため dom.ts から分離）。
 */

/** sanitize済みのHTML文字列を表すbranded type（II-169）。 */
declare const __safeHtml: unique symbol;
export type SafeHtml = string & { readonly [__safeHtml]: true };

/**
 * 文字列をSafeHtmlにキャストする。呼び出し元がXSS安全性を保証すること。
 * - sanitizeSvg済みのSVG
 * - formatMath（テキストノードのエスケープ＋MathML変換のみ）
 * - lib側で生成された問題文・ステップ（外部入力由来ではない）
 */
export function safeHtml(s: string): SafeHtml {
  return s as SafeHtml;
}
