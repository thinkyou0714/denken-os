import { describe, expect, it } from "vitest";
import { generate } from "../../lib/engine/generate.js";
import { StubNarrator } from "../../lib/engine/narrate.js";
import {
  dcMotorBackEmf,
  demandFactor,
  getTemplate,
  groundingResistance,
  linePowerLoss,
  listTopics,
  shortCircuitCapacity,
} from "../../lib/engine/templates/index.js";
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
  it("理論/電力/機械/法規/機械制御/電力管理 をカバーする", () => {
    const topics = listTopics();
    expect(topics).toContain("B種接地抵抗"); // 法規
    expect(topics).toContain("需要率"); // 電力
    expect(topics).toContain("単位換算"); // 理論（接頭語換算ドリル）
    expect(topics).toContain("短絡容量"); // 電力管理（%Z→短絡容量）
    expect(topics).toContain("直流電動機の逆起電力"); // 機械（E=V−Ia·Ra）
    expect(topics).toContain("三相線路の電力損失"); // 電力（3I²R）
    expect(topics.length).toBe(11);
  });

  it("全6科目に最低1テンプレートがある（科目カバレッジの抜けを回帰防止）", () => {
    const subjects = new Set<string>(listTopics().map((t) => getTemplate(t)!.subject));
    for (const s of ["理論", "電力", "機械", "法規", "電力管理", "機械制御"]) {
      expect(subjects.has(s), `科目「${s}」のテンプレートが無い`).toBe(true);
    }
  });

  it("短絡容量 Ps=Pn×100/%Z を正しく算出（100MVA, %Z=5 → 2000MVA, numeric）", () => {
    const g = shortCircuitCapacity.generateFrom({ base_capacity: 100, percent_impedance: 5 });
    expect(g!.format).toBe("numeric");
    expect(g!.answerText).toBe("2000");
    expect(g!.choices).toBeUndefined();
  });

  it("直流電動機の逆起電力 E=V−Ia·Ra を正しく算出（200V,20A,0.5Ω → 190V）", () => {
    const g = dcMotorBackEmf.generateFrom({ terminal_voltage: 200, armature_current: 20, armature_resistance: 0.5 });
    expect(g!.answerText).toBe("190");
    expect(g!.format).toBe("numeric");
  });

  it("逆起電力が非正（V≤Ia·Ra）の組は棄却される", () => {
    expect(
      dcMotorBackEmf.generateFrom({ terminal_voltage: 5, armature_current: 50, armature_resistance: 0.5 }),
    ).toBeNull();
  });

  it("三相線路の電力損失 3I²R を正しく算出（10A,0.5Ω → 150W）", () => {
    const g = linePowerLoss.generateFrom({ line_current: 10, resistance: 0.5 });
    expect(g!.answerText).toBe("150");
    expect(g!.format).toBe("numeric");
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
