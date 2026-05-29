import { describe, expect, it } from "vitest";
import { generate, generateOne } from "../../lib/engine/generate.js";
import { StubNarrator } from "../../lib/engine/narrate.js";
import {
  dcMotorEmf,
  lineVoltageDrop,
  shortCircuitCapacity,
  threePhasePower,
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

describe("新テンプレート: 電力管理（短絡容量）", () => {
  it("Ps = 基準容量×100/%Z を算出（20MVA, %Z=8 → 250MVA, numeric）", () => {
    const g = shortCircuitCapacity.generateFrom({ base_capacity: 20, percent_impedance: 8 });
    expect(g).not.toBeNull();
    expect(g!.format).toBe("numeric");
    expect(g!.answerText).toBe("250");
    expect(g!.choices).toBeUndefined();
    expect(shortCircuitCapacity.subject).toBe("電力管理");
  });

  it("20問生成→全件 validate 通過（電力管理）", async () => {
    const ps = await generate(shortCircuitCapacity, { count: 20, narrator: new StubNarrator(), rng: seededRng(11) });
    expect(ps.length).toBe(20);
    for (const p of ps) {
      expect(p.subject).toBe("電力管理");
      expect(validateProblem(p).ok).toBe(true);
    }
  });
});

describe("新テンプレート: 電力（単相2線式の電圧降下）", () => {
  it("vd = 2I(Rcosθ+Xsinθ) を算出（I=10,R=0.5,X=0.5,cosθ=0.8 → 14V）", () => {
    const g = lineVoltageDrop.generateFrom({ current: 10, resistance: 0.5, reactance: 0.5, power_factor: 0.8 });
    expect(g).not.toBeNull();
    expect(g!.answerText).toBe("14");
    expect(g!.choices).toEqual(["2", "7", "8", "14"]);
    expect(g!.choices).toContain(g!.answerText);
  });

  it("誤答は成立する典型ミスで、正解と重複しない", () => {
    const g = lineVoltageDrop.generateFrom({ current: 10, resistance: 0.5, reactance: 0.5, power_factor: 0.8 })!;
    const texts = g.distractors!.map((d) => d.text);
    expect(new Set(texts).size).toBe(3);
    expect(texts).not.toContain(g.answerText);
  });
});

describe("新テンプレート: 機械（直流電動機の逆起電力）", () => {
  it("E = V − Ia·Ra を算出（200V,10A,0.5Ω → 195V）", () => {
    const g = dcMotorEmf.generateFrom({ terminal_voltage: 200, armature_current: 10, armature_resistance: 0.5 });
    expect(g).not.toBeNull();
    expect(g!.answerText).toBe("195");
    expect(g!.choices).toEqual(["5", "195", "200", "205"]);
  });

  it("電圧降下が端子電圧以上なら物理的に棄却", () => {
    expect(dcMotorEmf.generateFrom({ terminal_voltage: 100, armature_current: 50, armature_resistance: 5 })).toBeNull();
  });
});

describe("動的難易度（係数で難度が変わる）", () => {
  it("三相電力: 高圧(6600V)は基準(200V)より難しく評価される", () => {
    const easy = threePhasePower.generateFrom({ line_voltage: 200, R: 3, X: 4 })!;
    const hard = threePhasePower.generateFrom({ line_voltage: 6600, R: 3, X: 4 })!;
    expect(easy.difficulty).toBe(2);
    expect(hard.difficulty).toBe(3);
  });

  it("短絡容量: %Zが小さい(8%)ほど難度が高い", () => {
    const hard = shortCircuitCapacity.generateFrom({ base_capacity: 20, percent_impedance: 8 })!;
    const easy = shortCircuitCapacity.generateFrom({ base_capacity: 50, percent_impedance: 10 })!;
    expect(hard.difficulty).toBe(3);
    expect(easy.difficulty).toBe(2);
  });

  it("生成パイプラインは draw の difficulty を採用し 1-5 に収まる", async () => {
    const ps = await generate(threePhasePower, { count: 40, narrator: new StubNarrator(), rng: seededRng(99) });
    const diffs = new Set(ps.map((p) => p.difficulty));
    expect(diffs.size).toBeGreaterThanOrEqual(2); // 固定でなく分布する
    for (const p of ps) {
      expect(p.difficulty).toBeGreaterThanOrEqual(1);
      expect(p.difficulty).toBeLessThanOrEqual(5);
    }
  });
});

describe("誤答解説の自動付与（教育的価値の保持）", () => {
  it("multiple_choice の解説末尾に『誤答の着眼』と各誤答の理由が付く", async () => {
    const p = await generateOne(threePhasePower, {
      id: "E-0001",
      source: "original",
      narrator: new StubNarrator(),
      rng: seededRng(7),
      maxAttempts: 50,
    });
    expect(p).not.toBeNull();
    expect(p!.solution.some((s) => s.includes("【誤答の着眼】"))).toBe(true);
    // 各誤答選択肢（正解以外）が理由つきで列挙される
    const noteLines = p!.solution.filter((s) => s.startsWith("・"));
    expect(noteLines.length).toBe(3);
    for (const choice of p!.choices!.filter((c) => c !== p!.answer)) {
      expect(noteLines.some((l) => l.includes(choice))).toBe(true);
    }
  });

  it("numeric（選択肢なし）には誤答の着眼を付けない", async () => {
    const p = await generateOne(shortCircuitCapacity, {
      id: "E-0002",
      source: "original",
      narrator: new StubNarrator(),
      rng: seededRng(7),
      maxAttempts: 50,
    });
    expect(p).not.toBeNull();
    expect(p!.solution.some((s) => s.includes("【誤答の着眼】"))).toBe(false);
  });
});
