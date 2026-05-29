import { describe, expect, it } from "vitest";
import { generate } from "../../lib/engine/generate.js";
import { StubNarrator } from "../../lib/engine/narrate.js";
import { demandFactor, groundingResistance, listTopics } from "../../lib/engine/templates/index.js";
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

describe("科目カバレッジ拡充（法規・電力）", () => {
  it("理論/電力/機械/法規/機械制御 をカバーする", () => {
    const topics = listTopics();
    expect(topics).toContain("B種接地抵抗"); // 法規
    expect(topics).toContain("需要率"); // 電力
    expect(topics.length).toBe(7);
  });

  it("B種接地抵抗 R=150/Ig を正しく算出（Ig=3 → 50Ω, numeric）", () => {
    const g = groundingResistance.generateFrom({ ground_fault_current: 3 });
    expect(g!.format).toBe("numeric");
    expect(g!.answerText).toBe("50");
    expect(g!.choices).toBeUndefined();
  });

  it("需要率 = 最大需要/設備容量×100 を正しく算出（150/200 → 75%）", () => {
    const g = demandFactor.generateFrom({ installed_capacity: 200, max_demand: 150 });
    expect(g!.answerText).toBe("75");
  });

  it("最大需要 ≥ 設備容量 は棄却される（需要率>100の不成立）", () => {
    expect(demandFactor.generateFrom({ installed_capacity: 100, max_demand: 100 })).toBeNull();
    expect(demandFactor.generateFrom({ installed_capacity: 100, max_demand: 120 })).toBeNull();
  });

  it("両テンプレで20問生成→全件 validate 通過", async () => {
    for (const t of [groundingResistance, demandFactor]) {
      const ps = await generate(t, { count: 20, narrator: new StubNarrator(), rng: seededRng(8) });
      expect(ps.length).toBe(20);
      for (const p of ps) expect(validateProblem(p).ok).toBe(true);
    }
  });
});
