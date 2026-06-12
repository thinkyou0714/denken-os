/**
 * sanitize.ts — SVG サニタイズユーティリティ。
 *
 * 設計意図: mascot.ts や figures/ のインライン SVG はビルド時固定・信頼済みのため
 * サニタイズ不要だが、将来ユーザー入力や外部データ由来の SVG を扱う際の安全柵として
 * このモジュールを提供する。
 * - `<script` タグを含む SVG はリフレクション XSS に直結する。
 * - `on*=` イベントハンドラー属性はインライン JS 実行の窓口になる。
 * - 外部 `href`/`xlink:href` は外部リソース読み込み（トラッキング・データ漏洩）になる。
 * 上記いずれかを検出したら空文字を返し console.warn で診断可能にする。
 */

/** 外部 href（data: / # / 相対パス以外）を検出する正規表現。 */
const EXTERNAL_HREF_RE = /(?:xlink:href|href)\s*=\s*["'][^"'#./][^"']*["']/i;

/**
 * SVG 文字列を検査し、危険なパターンが含まれる場合は空文字を返す。
 * - `<script` タグ
 * - `on*=` イベントハンドラー属性（例: `onload=`, `onclick=`）
 * - 外部 `href` / `xlink:href`（`#`, `./`, `/` 始まり以外）
 *
 * 安全と判断した場合は元の文字列をそのまま返す。
 * @param svg 検査対象の SVG 文字列
 * @returns サニタイズ後の SVG 文字列（危険なら空文字）
 */
export function sanitizeSvg(svg: string): string {
  if (/<script/i.test(svg)) {
    console.warn("[sanitize] SVG に <script> タグが含まれています。");
    return "";
  }
  if (/\bon\w+\s*=/i.test(svg)) {
    console.warn("[sanitize] SVG にイベントハンドラー属性（on*=）が含まれています。");
    return "";
  }
  if (EXTERNAL_HREF_RE.test(svg)) {
    console.warn("[sanitize] SVG に外部参照（href/xlink:href）が含まれています。");
    return "";
  }
  return svg;
}
