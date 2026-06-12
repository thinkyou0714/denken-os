/**
 * 問題データ拡充テンプレート（12種）の閉形式を固定値で検算する。
 * 手検算した期待値を固定し、ソルバの回帰を防ぐ（template-invariants が横断不変条件を担保）。
 */
import { describe, expect, it } from "vitest";
import {
  bTypeGrounding,
  capacityFactor,
  combinedCycleEfficiency,
  electricHeating,
  inducedEmf,
  insulationResistance,
  overheadClearance,
  rlcResonance,
  secondOrderResponse,
  thermalFuelConsumption,
  transformerParallelLoad,
  voltageClassification,
} from "../../lib/engine/templates/index.js";

describe("法規テンプレート（固定値検算）", () => {
  it("B種接地: 1秒以内遮断(600V)・Ig=10A → 60Ω", () => {
    const g = bTypeGrounding.generateFrom({ base_voltage: 600, ground_fault_current: 10 })!;
    expect(g.answerText).toBe("60");
    expect(g.answerUnit).toBe("Ω");
  });

  it("B種接地: 原則(150V)・Ig=5A → 30Ω / 不正な分子は null", () => {
    expect(bTypeGrounding.generateFrom({ base_voltage: 150, ground_fault_current: 5 })!.answerText).toBe("30");
    expect(bTypeGrounding.generateFrom({ base_voltage: 200, ground_fault_current: 5 })).toBeNull();
  });

  it("絶縁抵抗: 300V以下・対地150V以下 → 0.1MΩ（choices に正解を含む）", () => {
    const g = insulationResistance.generateFrom({ case_index: 0 })!;
    expect(g.answerText).toBe("0.1");
    expect(g.choices).toContain("0.1");
    expect(new Set(g.choices).size).toBe(g.choices!.length);
  });

  it("絶縁抵抗: 300V超 → 0.4MΩ", () => {
    expect(insulationResistance.generateFrom({ case_index: 2 })!.answerText).toBe("0.4");
  });

  it("電圧区分: 交流低圧の上限600V・直流750V・高圧上限7000V", () => {
    expect(voltageClassification.generateFrom({ case_index: 0 })!.answerText).toBe("600");
    expect(voltageClassification.generateFrom({ case_index: 1 })!.answerText).toBe("750");
    expect(voltageClassification.generateFrom({ case_index: 2 })!.answerText).toBe("7000");
  });

  it("架空電線の高さ: 道路横断6m・鉄道5.5m・横断歩道橋(高圧)3.5m・その他5m", () => {
    expect(overheadClearance.generateFrom({ case_index: 0 })!.answerText).toBe("6");
    expect(overheadClearance.generateFrom({ case_index: 1 })!.answerText).toBe("5.5");
    expect(overheadClearance.generateFrom({ case_index: 2 })!.answerText).toBe("3.5");
    expect(overheadClearance.generateFrom({ case_index: 3 })!.answerText).toBe("5");
  });
});

describe("電力テンプレート（固定値検算）", () => {
  it("コンバインドサイクル: ηG=35%, ηS=40% → 61%", () => {
    // η = 35 + (1−0.35)×40 = 35 + 26 = 61
    expect(combinedCycleEfficiency.generateFrom({ eta_gas: 35, eta_steam: 40 })!.answerText).toBe("61");
  });

  it("燃料消費量: η=40%, H=45000kJ/kg, W=10000kWh → 2000kg", () => {
    // m = 3600×10000/(0.4×45000) = 36000000/18000 = 2000
    expect(
      thermalFuelConsumption.generateFrom({ efficiency: 40, heating_value: 45000, energy: 10000 })!.answerText,
    ).toBe("2000");
  });

  it("設備利用率: 定格1000kW・30日で144000kWh → 20%", () => {
    // 144000/(1000×720)×100 = 20
    expect(capacityFactor.generateFrom({ rated_output: 1000, energy: 144000 })!.answerText).toBe("20");
  });
});

describe("機械テンプレート（固定値検算）", () => {
  it("電気加熱: 50kg・40K・3.5kW・η0.8 → 50min", () => {
    // Q=4.2×50×40=8400kJ, t=8400/2.8=3000s=50min
    expect(electricHeating.generateFrom({ mass: 50, delta_theta: 40, power: 3.5, efficiency: 0.8 })!.answerText).toBe(
      "50",
    );
  });

  it("並行運転の負荷分担: %Za=2, %Zb=3, 負荷1000kVA → A機600kVA（%Z逆比例）", () => {
    expect(transformerParallelLoad.generateFrom({ percent_z_a: 2, percent_z_b: 3, total_load: 1000 })!.answerText).toBe(
      "600",
    );
  });

  it("並行運転: %Zが等しい入力は null（出題として無意味）", () => {
    expect(transformerParallelLoad.generateFrom({ percent_z_a: 3, percent_z_b: 3, total_load: 900 })).toBeNull();
  });
});

describe("理論テンプレート（固定値検算）", () => {
  it("RLC共振: L=10mH, C=100μF → ω0=1000rad/s", () => {
    // LC=10e-3×100e-6=1e-6, ω0=1/√(1e-6)=1000
    expect(rlcResonance.generateFrom({ inductance: 10, capacitance: 100 })!.answerText).toBe("1000");
  });

  it("RLC共振: L=10mH, C=25μF → ω0=2000rad/s", () => {
    expect(rlcResonance.generateFrom({ inductance: 10, capacitance: 25 })!.answerText).toBe("2000");
  });

  it("電磁誘導: B=0.5T, l=0.4m, v=10m/s → e=2V", () => {
    expect(inducedEmf.generateFrom({ flux_density: 0.5, length: 0.4, velocity: 10 })!.answerText).toBe("2");
  });
});

describe("機械制御テンプレート（固定値検算）", () => {
  it("二次系: K=4, T=1 → ωn=2rad/s（ζ=0.25 を facts に保持）", () => {
    const g = secondOrderResponse.generateFrom({ gain: 4, time_constant: 1 })!;
    expect(g.answerText).toBe("2");
    expect(g.facts.zeta).toBe(0.25);
  });

  it("二次系: K=25, T=4 → ωn=2.5rad/s, ζ=0.05", () => {
    const g = secondOrderResponse.generateFrom({ gain: 25, time_constant: 4 })!;
    expect(g.answerText).toBe("2.5");
    expect(g.facts.zeta).toBe(0.05);
  });
});
