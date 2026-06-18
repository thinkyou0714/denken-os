/**
 * markdown.ts — Claude 応答向けの最小・XSS安全な Markdown レンダラー（純ロジック）。
 *
 * 方針: Claude（API モード）の回答は Markdown 記法を含むが、mathfmt.formatMath は
 *   下付き/上付きだけを扱うため `**強調**` や箇条書きが生のまま残って読みにくい。
 *   KaTeX 等の重い依存を避けるオフライン方針を守りつつ、最小限の記法だけを安全に整形する。
 *
 * 安全性の鉄則: 必ず最初に HTML をエスケープし、その後でエスケープ済みの安全な文字列に対して
 *   インライン/ブロック記法を <strong>/<em>/<code>/<ul>/<ol>/<h3> 等へ変換する。
 *   ユーザー入力（および LLM 出力）由来のため <script> や on*= が混入しても無害化される。
 *
 * 対応記法（意図的に最小）:
 *   - 見出し: `#`〜`######`（すべて <h3> に正規化。チャット内では大きすぎる見出しを避ける）
 *   - 箇条書き: `- ` / `* ` / `1. ` （連続行を <ul>/<ol> にまとめる）
 *   - 強調: `**bold**` / `__bold__` → <strong>、`*italic*` / `_italic_` → <em>
 *   - インラインコード: `` `code` ``（中身は二重エスケープせずそのまま <code> に入れる）
 *   - 段落/改行: 空行で段落分割、段落内の改行は <br>
 */

import { escapeHtml } from "./mathfmt.js";

/** インライン記法（コード→強調→イタリック）をエスケープ済み文字列に適用する。 */
function renderInline(escaped: string): string {
  // インラインコードを最初に処理し、コード内の `*` 等が強調変換されないようにする。
  // 中身は既に escapeHtml 済みのため、ここで再エスケープはしない。
  let s = escaped.replace(/`([^`]+)`/g, (_m, code) => `<code>${code}</code>`);
  // 太字（**...** / __...__）。最短一致で隣接した強調が結合しないようにする。
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  // イタリック（*...* / _..._）。直前で太字を処理済みなので残った単独記号だけが対象。
  s = s.replace(/\*([^*\n]+)\*/g, "<em>$1</em>");
  s = s.replace(/_([^_\n]+)_/g, "<em>$1</em>");
  return s;
}

/** 1ブロック（段落 or リスト or 見出し）を HTML 文字列にする。 */
function renderBlock(block: string): string {
  const lines = block.split("\n");
  // 見出し（先頭行が # で始まる単独ブロック）。すべて <h3> に正規化する。
  const firstLine = lines[0] ?? "";
  const headingMatch = /^#{1,6}\s+(.*)$/.exec(firstLine);
  if (lines.length === 1 && headingMatch) {
    return `<h3>${renderInline(escapeHtml(headingMatch[1] ?? ""))}</h3>`;
  }
  // 順序付きリスト（全行が `N. ` で始まる）。
  if (lines.every((l) => /^\s*\d+\.\s+/.test(l))) {
    const items = lines.map((l) => `<li>${renderInline(escapeHtml(l.replace(/^\s*\d+\.\s+/, "")))}</li>`).join("");
    return `<ol>${items}</ol>`;
  }
  // 箇条書き（全行が `- ` または `* ` で始まる）。
  if (lines.every((l) => /^\s*[-*]\s+/.test(l))) {
    const items = lines.map((l) => `<li>${renderInline(escapeHtml(l.replace(/^\s*[-*]\s+/, "")))}</li>`).join("");
    return `<ul>${items}</ul>`;
  }
  // 通常段落。ブロック内の改行は <br>。
  const html = lines.map((l) => renderInline(escapeHtml(l))).join("<br>");
  return `<p>${html}</p>`;
}

/**
 * Markdown 文字列を XSS 安全な HTML に変換する。
 * 必ず escapeHtml を最初に適用してから記法変換するため、innerHTML に安全に渡せる。
 * @param raw Claude 等が生成した Markdown テキスト
 * @returns サニタイズ済みの HTML 文字列
 */
export function renderMarkdown(raw: string): string {
  // 改行コードを正規化し、空行（連続改行）で段落ブロックに分割する。
  const normalized = raw.replace(/\r\n?/g, "\n").trim();
  if (normalized === "") return "";
  const blocks = normalized.split(/\n{2,}/);
  return blocks.map(renderBlock).join("");
}
