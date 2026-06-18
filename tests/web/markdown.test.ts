/**
 * tests/web/markdown.test.ts — 最小 Markdown レンダラー（II-15）。
 *
 * Claude 応答の Markdown を XSS 安全に整形することを検証する。
 * 最重要: HTML を必ず最初にエスケープすること（XSS エスケープのテストを含む）。
 */
import { describe, expect, it } from "vitest";
import { renderMarkdown } from "../../web/src/markdown.js";

describe("renderMarkdown（最小 Markdown）", () => {
  it("空文字は空文字を返す", () => {
    expect(renderMarkdown("")).toBe("");
    expect(renderMarkdown("   \n  ")).toBe("");
  });

  it("プレーンテキストは段落になる", () => {
    expect(renderMarkdown("こんにちは")).toBe("<p>こんにちは</p>");
  });

  it("**bold** を <strong> に変換する", () => {
    expect(renderMarkdown("これは **重要** です")).toBe("<p>これは <strong>重要</strong> です</p>");
    expect(renderMarkdown("__太字__")).toBe("<p><strong>太字</strong></p>");
  });

  it("*italic* を <em> に変換する", () => {
    expect(renderMarkdown("これは *強調* です")).toBe("<p>これは <em>強調</em> です</p>");
    expect(renderMarkdown("_斜体_")).toBe("<p><em>斜体</em></p>");
  });

  it("`code` を <code> に変換する", () => {
    expect(renderMarkdown("変数 `x` を使う")).toBe("<p>変数 <code>x</code> を使う</p>");
  });

  it("コード内の記号は強調変換されない", () => {
    // `**` がコード内にある場合は強調にしない（コード優先）。
    expect(renderMarkdown("`a ** b`")).toBe("<p><code>a ** b</code></p>");
  });

  it("- 箇条書きを <ul><li> にまとめる", () => {
    expect(renderMarkdown("- りんご\n- みかん")).toBe("<ul><li>りんご</li><li>みかん</li></ul>");
    expect(renderMarkdown("* a\n* b")).toBe("<ul><li>a</li><li>b</li></ul>");
  });

  it("1. 番号付きリストを <ol><li> にまとめる", () => {
    expect(renderMarkdown("1. 一\n2. 二\n3. 三")).toBe("<ol><li>一</li><li>二</li><li>三</li></ol>");
  });

  it("### 見出しを <h3> に正規化する", () => {
    expect(renderMarkdown("# 大見出し")).toBe("<h3>大見出し</h3>");
    expect(renderMarkdown("### 小見出し")).toBe("<h3>小見出し</h3>");
  });

  it("空行で段落を分割する", () => {
    expect(renderMarkdown("第一段落\n\n第二段落")).toBe("<p>第一段落</p><p>第二段落</p>");
  });

  it("段落内の改行は <br> になる", () => {
    expect(renderMarkdown("一行目\n二行目")).toBe("<p>一行目<br>二行目</p>");
  });

  // ---- XSS エスケープ（最重要）----
  it("HTML を最初にエスケープする（script タグが実行可能な形で残らない）", () => {
    const out = renderMarkdown("<script>alert(1)</script>");
    expect(out).not.toContain("<script>");
    expect(out).toContain("&lt;script&gt;");
  });

  it("属性インジェクション（onerror=）も無害化される", () => {
    const out = renderMarkdown('<img src=x onerror="evil()">');
    expect(out).not.toContain("<img");
    expect(out).toContain("&lt;img");
  });

  it("強調内の HTML もエスケープされる（エスケープ→記法変換の順）", () => {
    const out = renderMarkdown("**<b>x</b>**");
    // 太字記法は適用されるが、中の <b> はエスケープ済み。
    expect(out).toContain("<strong>");
    expect(out).toContain("&lt;b&gt;");
    expect(out).not.toContain("<b>x</b>");
  });

  it("リンク記法は <a> を生成しない（最小実装の安全側: javascript: スキームを実行可能にしない）", () => {
    const out = renderMarkdown("[link](javascript:alert(1))");
    expect(out).not.toContain("<a ");
    expect(out).not.toContain("href");
  });
});
