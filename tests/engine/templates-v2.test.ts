/**
 * 第2弾テンプレート（理論/電力/機械/法規/二次）の既知値回帰テスト。
 *  - generateFrom（決定論経路）で既知 params → 既知の正解になることを固定する。
 *  - 数値・選択肢テキスト・記述の答えを exact 一致で検証（ソルバーの退行検知）。
 */
import { describe, expect, it } from "vitest";
import { generate } from "../../lib/engine/generate.js";
import { StubNarrator } from "../../lib/engine/narrate.js";
import type { Template } from "../../lib/engine/templates/index.js";
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

describe("第2弾テンプレートの既知値（generateFrom）", () => {
  const cases: [string, Template, Record<string, number>, string][] = [
    // 理論
    ["オームの法則", T.ohmsLaw, { current: 5, resistance: 4 }, "20"],
    ["分流の法則", T.currentDivider, { total_current: 10, R1: 2, R2: 3 }, "6"],
    ["キルヒホッフ", T.kirchhoffLoop, { emf1: 18, emf2: 6, R1: 2, R2: 4 }, "2"],
    ["重ね合わせ", T.superposition, { emf1: 20, emf2: 10, resistance: 5 }, "6"],
    ["テブナン", T.thevenin, { emf: 12, R1: 4, R2: 4, load: 1 }, "2"],
    ["直列共振", T.seriesResonance, { inductance_mh: 1, capacitance_uf: 1000 }, "1000"],
    ["電界", T.electricFieldPotential, { charge_uc: 2, distance_m: 3 }, "2000"],
    ["磁界(ソレノイド)", T.magneticFieldSolenoid, { turns: 200, length_m: 0.5, current: 2 }, "800"],
    ["電磁力", T.electromagneticForce, { flux_density: 0.5, current: 10, conductor_length: 2 }, "10"],
    ["電磁誘導", T.electromagneticInduction, { turns: 200, flux_change_wb: 0.05, time_s: 0.1 }, "100"],
    ["RC過渡", T.rcTransient, { source_voltage: 100 }, "63"],
    // 電力
    ["火力熱効率", T.thermalEfficiency, { boiler: 0.9, turbine: 0.5, generator: 0.96 }, "43.2"],
    ["揚水効率", T.pumpedStorage, { flow: 10, head: 20, efficiency: 0.8 }, "2450"],
    ["三相電圧降下", T.threePhaseVoltageDrop, { current: 10, R: 2, X: 1 }, "38.06"],
    ["電力損失", T.powerLoss, { current: 10, resistance: 2 }, "600"],
    ["変圧器並行運転", T.transformerParallel, { load: 150, percent_z_a: 4, percent_z_b: 6 }, "90"],
    // 機械
    [
      "直流電動機回転速度",
      T.dcMotorSpeed,
      { terminal_voltage: 100, armature_current: 10, armature_resistance: 0.5, machine_constant: 0.05 },
      "1900",
    ],
    [
      "直流発電機起電力",
      T.dcGeneratorEmf,
      { terminal_voltage: 200, armature_current: 20, armature_resistance: 0.5 },
      "210",
    ],
    ["同期発電機出力", T.synchronousOutput, { induced_voltage_pu: 1.2, reactance_pu: 0.8 }, "0.75"],
    ["誘導機トルク", T.inductionTorque, { voltage_ratio: 0.8 }, "64"],
    ["伝達関数(縦続)", T.transferFunction, { gain1: 10, gain2: 5 }, "50"],
    ["照度(逆二乗)", T.illuminance, { luminous_intensity: 900, distance_m: 3 }, "100"],
    ["電熱", T.electricHeating, { mass: 10, temp_initial: 20, temp_final: 100, efficiency: 0.7 }, "4800"],
    // 法規
    ["電圧の区分(AC6600)", T.voltageClass, { voltage: 6600, is_dc: 0 }, "高圧"],
    ["低圧絶縁抵抗(200V)", T.insulationResistance, { earth_voltage: 200 }, "0.2"],
    ["D種接地抵抗", T.groundingTypes, { type_index: 2 }, "100"],
    ["風圧荷重", T.windLoad, { wind_pressure: 980, area: 0.2 }, "196"],
    ["支線張力", T.guyWireTension, { horizontal_tension: 1200, pole_height: 4, horizontal_distance: 3 }, "2000"],
    // 二次
    ["対称座標法(一線地絡)", T.symmetricalComponents, { phase_emf: 210, z1: 2, z2: 2, z0: 3 }, "90"],
    ["中性点接地と地絡", T.neutralGroundingFault, { phase_voltage: 200, neutral_resistance: 10 }, "20"],
    ["系統安定度", T.systemStability, { sending_voltage_pu: 1.0, receiving_voltage_pu: 1.0, reactance_pu: 0.5 }, "2"],
    ["調相設備", T.reactiveCompensation, { active_power: 300, pf_before: 0.6, pf_after: 0.8 }, "175"],
    [
      "誘導機等価回路",
      T.inductionEquivalentCircuit,
      { input: 10000, primary_loss: 500, iron_loss: 300, slip: 0.04 },
      "8832",
    ],
    [
      "同期機の出力と安定度",
      T.synchronousStability,
      { terminal_voltage_pu: 1.0, induced_voltage_pu: 1.5, reactance_pu: 0.6 },
      "2.5",
    ],
  ];

  for (const [label, tmpl, params, expected] of cases) {
    it(`${label}: generateFrom が ${expected.length > 12 ? `${expected.slice(0, 12)}…` : expected} を返す`, () => {
      const g = tmpl.generateFrom(params);
      expect(g, label).not.toBeNull();
      expect(g!.answerText, label).toBe(expected);
    });
  }
});

describe("選択式（定性）テンプレートの構造", () => {
  it("中性点接地方式: variant 2 は非接地の特徴・4選択肢", () => {
    const g = T.neutralGrounding.generateFrom({ variant: 2 });
    expect(g).not.toBeNull();
    expect(g!.choices?.length).toBe(4);
    expect(g!.answerText).toContain("線間電圧まで上昇");
  });

  it("電気主任技術者: 6600V は第三種", () => {
    const g = T.chiefEngineer.generateFrom({ voltage: 6600 });
    expect(g!.answerText).toBe("第三種電気主任技術者");
    expect(g!.choices).toContain("第一種電気主任技術者");
  });

  it("ラウス安定判別: a·b>c で安定の結論", () => {
    const g = T.stabilityCriterion.generateFrom({ a: 2, b: 3, c: 1 });
    expect(g!.answerText).toContain("安定（全係数が正");
    expect(g!.choices?.length).toBe(4);
  });

  it("高圧受電設備/保護リレー: 4選択肢で answer∈choices", () => {
    for (const tmpl of [T.hvSubstation, T.protectiveRelay]) {
      const g = tmpl.generateFrom({ variant: 1 });
      expect(g!.choices?.length).toBe(4);
      expect(g!.choices).toContain(g!.answerText);
    }
  });
});

describe("第2弾テンプレートの生成（StubNarrator・全件 validate 通過）", () => {
  it("代表テンプレで各12問生成 → 全件 validate / 誤答解説 or 採点観点を持つ", async () => {
    const reps: Template[] = [
      T.ohmsLaw,
      T.thermalEfficiency,
      T.dcMotorSpeed,
      T.voltageClass,
      T.symmetricalComponents,
      T.stabilityCriterion,
    ];
    for (const t of reps) {
      const ps = await generate(t, { count: 12, narrator: new StubNarrator(), rng: seededRng(99) });
      expect(ps.length, t.topic).toBe(12);
      for (const p of ps) {
        expect(validateProblem(p).ok, `${t.topic} validate`).toBe(true);
        if (p.format === "descriptive") expect(p.grading_points?.length, t.topic).toBeGreaterThan(0);
        else expect(p.choice_explanations?.length, t.topic).toBe(p.choices!.length);
        expect(p.cognitive_level, t.topic).toBeTruthy();
      }
    }
  });
});
