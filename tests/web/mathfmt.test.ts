import { describe, expect, it } from "vitest";
import { escapeHtml, formatMath } from "../../web/src/mathfmt.js";

describe("mathfmt（数式の軽量整形）", () => {
  it("HTML をエスケープする（XSS 防止）", () => {
    expect(escapeHtml("<script>")).toBe("&lt;script&gt;");
    expect(formatMath("a & b < c")).toBe("a &amp; b &lt; c");
    expect(formatMath("<img onerror=x>")).not.toContain("<img");
  });

  it("下付き(_)を <sub> に整形する（V_p, P_out）", () => {
    expect(formatMath("V_p")).toBe("V<sub>p</sub>");
    expect(formatMath("P_out = 3")).toBe("P<sub>out</sub> = 3");
  });

  it("上付き(^)を <sup> に整形する（R^2, x^{2n}）", () => {
    expect(formatMath("R^2")).toBe("R<sup>2</sup>");
    expect(formatMath("x^{2n}")).toBe("x<sup>2n</sup>");
  });

  it("Unicode の上付き・√・ギリシャ文字はそのまま残す", () => {
    const s = formatMath("|Z|=√(8²+6²)=10Ω、cosφ=0.8");
    expect(s).toContain("√(8²+6²)");
    expect(s).toContain("cosφ");
  });
});
