import { describe, expect, it } from "vitest";
import { generate } from "../../lib/engine/generate.js";
import { StubNarrator } from "../../lib/engine/narrate.js";
import { listTopics, transformerVoltageRegulation } from "../../lib/engine/templates/index.js";
import { validateProblem } from "../../lib/engine/validate.js";

function seededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("記述(descriptive)形式: 二種二次の変圧器電圧変動率", () => {
  it("レジストリに登録され二種二次科目を含む", () => {
    expect(listTopics()).toContain("変圧器の電圧変動率");
    expect(transformerVoltageRegulation.exam).toBe("denken2_secondary");
  });

  it("ε≈p·cosθ+q·sinθ を正しく算出（p=2,q=5,cosθ=0.8 → 4.6%）", () => {
    const g = transformerVoltageRegulation.generateFrom({
      percent_resistance: 2,
      percent_reactance: 5,
      power_factor: 0.8,
    });
    expect(g).not.toBeNull();
    expect(g!.format).toBe("descriptive");
    expect(g!.answerText).toBe("4.6");
    expect(g!.choices).toBeUndefined(); // 記述は選択肢なし
  });

  it("生成された記述問題は choices 無しで schema/不変条件を通る", async () => {
    const problems = await generate(transformerVoltageRegulation, {
      count: 20,
      narrator: new StubNarrator(),
      rng: seededRng(3),
    });
    expect(problems.length).toBe(20);
    for (const p of problems) {
      expect(p.format).toBe("descriptive");
      expect(p.choices).toBeUndefined();
      expect(validateProblem(p).ok).toBe(true);
    }
  });

  it("記述問題に部分点ルーブリックが付与され、配点合計>0・id一意", async () => {
    const [p] = await generate(transformerVoltageRegulation, {
      count: 1,
      narrator: new StubNarrator(),
      rng: seededRng(5),
    });
    expect(p!.rubric).toBeDefined();
    const rubric = p!.rubric!;
    expect(rubric.length).toBeGreaterThan(0);
    expect(rubric.reduce((a, r) => a + r.points, 0)).toBeGreaterThan(0);
    const ids = rubric.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    // 必須観点が最低1つある（合否に直結する観点）。
    expect(rubric.some((r) => r.required)).toBe(true);
  });
});
