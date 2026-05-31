/**
 * 拡充テンプレートの回帰テスト。
 *  - generateFrom（決定論経路）で既知 params → 既知の正解になることを固定。
 *  - 生成パイプラインが choice_explanations（誤答解説）と numeric.tolerance を永続化することを検証。
 */
import { describe, expect, it } from "vitest";
import { generate } from "../../lib/engine/generate.js";
import { StubNarrator } from "../../lib/engine/narrate.js";
import * as T from "../../lib/engine/templates/index.js";
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

describe("拡充テンプレートの既知値", () => {
  const cases: [string, import("../../lib/engine/templates/index.js").Template, Record<string, number>, string][] = [
    ["分圧の法則", T.voltageDivider, { emf: 100, R1: 1, R2: 3 }, "75"],
    ["ブリッジ平衡", T.wheatstoneBridge, { R1: 25, R2: 50, R3: 100 }, "200"],
    ["RLC直列Z", T.rlcSeriesImpedance, { R: 3, XL: 6, XC: 2 }, "5"],
    ["クーロン力", T.coulombForce, { q1: 20, q2: 20, r: 3 }, "0.4"],
    ["最大電力", T.maxPowerTransfer, { emf: 10, r: 25 }, "1"],
    ["水力出力", T.hydroPower, { flow: 10, head: 20, efficiency: 0.8 }, "1568"],
    ["短絡電流", T.percentImpedanceShortCircuit, { rated_current: 100, percent_impedance: 5 }, "2000"],
    ["力率改善", T.powerFactorCorrection, { active_power: 12, pf_before: 0.8, pf_after: 1.0 }, "9"],
    ["電圧降下", T.transmissionVoltageDrop, { current: 10, R: 1, X: 1 }, "28"],
    ["弛度", T.sag, { load: 20, span: 100, tension: 25000 }, "1"],
    ["負荷率", T.loadFactor, { max_demand: 100, avg_demand: 60 }, "60"],
    ["不等率", T.diversityFactor, { sum_of_individual_max: 150, combined_max: 100 }, "1.5"],
    ["変圧器効率", T.transformerEfficiency, { output: 90, iron_loss: 2, copper_loss: 4 }, "93.75"],
    ["二次比例配分", T.inductionPowerSplit, { secondary_input: 10, slip: 5 }, "9.5"],
    ["逆起電力", T.dcMotorEmf, { terminal_voltage: 100, armature_current: 10, armature_resistance: 0.5 }, "95"],
    ["同期速度", T.synchronousSpeed, { frequency: 60, poles: 4 }, "1800"],
    ["単相全波", T.singlePhaseRectifier, { ac_voltage: 100 }, "90"],
    ["昇圧チョッパ", T.boostChopper, { input_voltage: 100, duty: 0.75 }, "400"],
    ["絶縁耐力", T.insulationWithstandVoltage, { max_operating_voltage: 6900 }, "10350"],
    ["最大使用電圧", T.maxOperatingVoltage, { nominal_voltage: 6600 }, "6900"],
    ["短絡容量", T.shortCircuitCapacity, { base_capacity: 20, percent_impedance: 20 }, "100"],
  ];

  for (const [label, tmpl, params, expected] of cases) {
    it(`${label}: generateFrom が ${expected} を返す`, () => {
      const g = tmpl.generateFrom(params);
      expect(g, label).not.toBeNull();
      expect(g!.answerText).toBe(expected);
    });
  }
});

describe("誤答解説・数値メタの永続化", () => {
  it("multiple_choice には選択肢数ぶんの choice_explanations が付き、correct はちょうど1件で answer と一致", async () => {
    const ps = await generate(T.voltageDivider, { count: 5, narrator: new StubNarrator(), rng: seededRng(3) });
    expect(ps.length).toBe(5);
    for (const p of ps) {
      expect(p.format).toBe("multiple_choice");
      expect(p.choice_explanations).toBeDefined();
      expect(p.choice_explanations!.length).toBe(p.choices!.length);
      const correct = p.choice_explanations!.filter((c) => c.correct);
      expect(correct.length).toBe(1);
      expect(correct[0]!.choice).toBe(p.answer);
      // 誤答にはミスの理由（"誤り" を含む説明）が入る。
      for (const ce of p.choice_explanations!) {
        if (!ce.correct) expect(ce.explanation).toContain("誤り");
      }
      expect(validateProblem(p).ok).toBe(true);
    }
  });

  it("numeric には numeric.tolerance/unit が付き、choices/choice_explanations を持たない", async () => {
    const ps = await generate(T.sag, { count: 5, narrator: new StubNarrator(), rng: seededRng(5) });
    expect(ps.length).toBe(5);
    for (const p of ps) {
      expect(p.format).toBe("numeric");
      expect(p.numeric?.tolerance).toBeGreaterThanOrEqual(0);
      expect(p.numeric?.unit).toBe("m");
      expect(p.choices).toBeUndefined();
      expect(p.choice_explanations).toBeUndefined();
      expect(validateProblem(p).ok).toBe(true);
    }
  });

  it("テンプレートのメタ（tags/formulas/learning_objectives 等）が問題に転記される", async () => {
    const [p] = await generate(T.percentImpedanceShortCircuit, {
      count: 1,
      narrator: new StubNarrator(),
      rng: seededRng(11),
    });
    expect(p!.tags).toContain("短絡電流");
    expect(p!.formulas?.length).toBeGreaterThan(0);
    expect(p!.learning_objectives?.length).toBeGreaterThan(0);
    expect(p!.hints?.length).toBeGreaterThan(0);
    expect(p!.estimated_time_sec).toBeGreaterThan(0);
  });

  it("descriptive（短絡容量）には grading_points が付き、choices を持たない", async () => {
    const [p] = await generate(T.shortCircuitCapacity, {
      count: 1,
      narrator: new StubNarrator(),
      rng: seededRng(13),
    });
    expect(p!.format).toBe("descriptive");
    expect(p!.grading_points?.length).toBeGreaterThan(0);
    expect(p!.references?.length).toBeGreaterThan(0);
    expect(p!.choices).toBeUndefined();
  });
});
