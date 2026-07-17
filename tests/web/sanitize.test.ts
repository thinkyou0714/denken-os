import { describe, expect, it } from "vitest";
import { sanitizeSvg } from "../../web/src/sanitize.js";

describe("sanitizeSvg — SVG サニタイズ", () => {
  it("正常な SVG はそのまま返す", () => {
    const svg = `<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="20" fill="#ffd645"/></svg>`;
    expect(sanitizeSvg(svg)).toBe(svg);
  });

  it("<script> タグを含む SVG は空文字を返す", () => {
    const svg = `<svg><script>alert(1)</script><rect/></svg>`;
    expect(sanitizeSvg(svg)).toBe("");
  });

  it("<SCRIPT> 大文字でも検出する（大文字小文字不問）", () => {
    const svg = `<svg><SCRIPT>evil()</SCRIPT></svg>`;
    expect(sanitizeSvg(svg)).toBe("");
  });

  it("onload= イベントハンドラー属性を含む SVG は空文字を返す", () => {
    const svg = `<svg><image onload="evil()" href="./x.png"/></svg>`;
    expect(sanitizeSvg(svg)).toBe("");
  });

  it("onclick= 属性も検出する", () => {
    const svg = `<svg><rect onclick="evil()"/></svg>`;
    expect(sanitizeSvg(svg)).toBe("");
  });

  it("外部 href（https://）を含む SVG は空文字を返す", () => {
    const svg = `<svg><image href="https://evil.example.com/track.png"/></svg>`;
    expect(sanitizeSvg(svg)).toBe("");
  });

  it("外部 xlink:href を含む SVG は空文字を返す", () => {
    const svg = `<svg><use xlink:href="http://evil.example.com/icon.svg#x"/></svg>`;
    expect(sanitizeSvg(svg)).toBe("");
  });

  it("内部参照（#fragment）の href は安全として通過させる", () => {
    const svg = `<svg><use href="#icon-x"/></svg>`;
    expect(sanitizeSvg(svg)).toBe(svg);
  });

  it("相対パスの href（./）は安全として通過させる", () => {
    const svg = `<svg><image href="./icon.svg"/></svg>`;
    expect(sanitizeSvg(svg)).toBe(svg);
  });

  it("空の SVG はそのまま返す", () => {
    expect(sanitizeSvg("")).toBe("");
  });

  // ── ブロックリスト強化: on*= / <script / 外部 href を含まない古典的迂回ベクター ──

  it("SMIL <animate> による href 書き換え（javascript:）を拒否する", () => {
    const svg = `<svg><a><animate attributeName="href" values="javascript:alert(1)"/><text>x</text></a></svg>`;
    expect(sanitizeSvg(svg)).toBe("");
  });

  it("SMIL <set> 要素を拒否する", () => {
    const svg = `<svg><a><set attributeName="href" to="#x"/><text>x</text></a></svg>`;
    expect(sanitizeSvg(svg)).toBe("");
  });

  it("<style> 要素を拒否する", () => {
    const svg = `<svg><style>@import url(//evil.example.com/x.css);</style><rect/></svg>`;
    expect(sanitizeSvg(svg)).toBe("");
  });

  it("<foreignObject>（任意 HTML の埋め込み口）を拒否する", () => {
    const svg = `<svg><foreignObject><iframe src="//evil.example.com"></iframe></foreignObject></svg>`;
    expect(sanitizeSvg(svg)).toBe("");
  });

  it("属性位置を問わず javascript: スキームを拒否する", () => {
    const svg = `<svg><a href="#x" target="javascript:alert(1)"><text>x</text></a></svg>`;
    expect(sanitizeSvg(svg)).toBe("");
  });

  it("<settings> のような接頭辞一致の無害な要素名は誤検出しない", () => {
    // \b 境界により <set> は拒否・<settings> は通す（誤爆防止の回帰テスト）。
    const svg = `<svg><metadata><settings mode="a"/></metadata><rect/></svg>`;
    expect(sanitizeSvg(svg)).toBe(svg);
  });
});
