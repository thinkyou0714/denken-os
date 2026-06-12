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
});
