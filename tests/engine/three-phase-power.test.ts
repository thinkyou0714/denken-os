import { describe, expect, it } from "vitest";
import { threePhasePower } from "../../lib/engine/templates/three-phase-power.js";

describe("threePhasePower テンプレート", () => {
  it("T-0001 と同 params で同じ正解(3.2kW)・選択肢を再現する", () => {
    const g = threePhasePower.generateFrom({ line_voltage: 200, R: 8, X: 6 });
    expect(g).not.toBeNull();
    expect(g!.answerText).toBe("3.2");
    expect(g!.choices).toEqual(["2.56", "3.2", "4.0", "9.6"]);
    expect(g!.likelyWrongChoice).toBe("9.6"); // √3忘れが最頻誤答
    expect(g!.physicallyValid).toBe(true);
  });

  it("P = V²·R/(R²+X²) の閉形式が正しい（別 params）", () => {
    // V=100, R=3, X=4 → P=100²·3/25=1200W=1.2kW
    const g = threePhasePower.generateFrom({ line_voltage: 100, R: 3, X: 4 });
    expect(g!.answerText).toBe("1.2");
    expect(g!.choices).toContain("1.2");
  });

  it("ランダム生成は綺麗な値・物理的に成立・answer∈choices を満たす", () => {
    let s = 12345;
    const rng = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    for (let i = 0; i < 50; i++) {
      const g = threePhasePower.generate(rng);
      if (!g) continue;
      expect(g.choices).toContain(g.answerText);
      expect(g.choices.length).toBe(4);
      expect(g.physicallyValid).toBe(true);
    }
  });
});
