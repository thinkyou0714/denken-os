/**
 * pastexam-denken2-twist-templates.test.ts — 電験二種対策の在庫5倍化で追加した
 * 「過去問の数値・考え方をひねった文章問題」21テンプレの閉形式検算とプロパティ検証。
 *
 * 各テンプレについて:
 *   - generateFrom(代表入力) の answerText / answerUnit / format が固定値どおり
 *   - 不成立条件（物理的前提を破る入力）が null で棄却される
 *   - generate(seededRng) を回した非null draw すべてで answerText が綺麗な有限数
 * （横断的な物理成立・レンジ・解説整合は tests/engine/template-invariants.test.ts が担保）
 */
import { describe, expect, it } from "vitest";
import { isCleanAnswer } from "../../lib/engine/clean.js";
import { acBridgeBalance } from "../../lib/engine/templates/ac-bridge-balance.js";
import { allDayEfficiency } from "../../lib/engine/templates/all-day-efficiency.js";
import { buckBoostChopper } from "../../lib/engine/templates/buck-boost-chopper.js";
import { chargeRedistribution } from "../../lib/engine/templates/charge-redistribution.js";
import { condenserCoolingWater } from "../../lib/engine/templates/condenser-cooling-water.js";
import { coupledInductorConnection } from "../../lib/engine/templates/coupled-inductor-connection.js";
import { currentTransformerRelay } from "../../lib/engine/templates/current-transformer-relay.js";
import { dailyLoadFactor } from "../../lib/engine/templates/daily-load-factor.js";
import { dcMotorSpeedResistance } from "../../lib/engine/templates/dc-motor-speed-resistance.js";
import { elevatorCounterweightPower } from "../../lib/engine/templates/elevator-counterweight-power.js";
import { governorLoadSharing } from "../../lib/engine/templates/governor-load-sharing.js";
import { groundFaultPotentialRise } from "../../lib/engine/templates/ground-fault-potential-rise.js";
import { heatPumpCop } from "../../lib/engine/templates/heat-pump-cop.js";
import { inductionMotorEfficiency } from "../../lib/engine/templates/induction-motor-efficiency.js";
import { loopDistributionCurrent } from "../../lib/engine/templates/loop-distribution-current.js";
import { partialDielectricCapacitor } from "../../lib/engine/templates/partial-dielectric-capacitor.js";
import { pfImprovementCapacity } from "../../lib/engine/templates/pf-improvement-capacity.js";
import { routhStabilityLimit } from "../../lib/engine/templates/routh-stability-limit.js";
import { seriesPercentImpedanceFault } from "../../lib/engine/templates/series-percent-impedance-fault.js";
import { starDeltaStarting } from "../../lib/engine/templates/star-delta-starting.js";
import { threePhaseRectifier } from "../../lib/engine/templates/three-phase-rectifier.js";
import type { Template } from "../../lib/engine/templates/types.js";
import { seededRng } from "../helpers/rng.js";

/** generate() を回数分回し、返った非nullの answerText がすべて綺麗な有限数であることを検証する。 */
function expectCleanGeneration(t: Template, seed: number, runs = 40): void {
  const rng = seededRng(seed);
  let drawn = 0;
  for (let i = 0; i < runs * 4 && drawn < runs; i++) {
    const g = t.generate(rng);
    if (!g) continue;
    drawn += 1;
    const n = Number(g.answerText);
    expect(Number.isFinite(n), `${t.topic}: answerText=${g.answerText} は有限数であるべき`).toBe(true);
    expect(isCleanAnswer(n), `${t.topic}: answerText=${g.answerText} は綺麗な値であるべき`).toBe(true);
  }
  expect(drawn, `${t.topic}: 有効な draw が得られない`).toBeGreaterThan(0);
}

describe("二種二次・電力管理（descriptive）の閉形式検算", () => {
  it("日負荷曲線と負荷率（20/60/100MW, ピーク8h → 60%）", () => {
    const g = dailyLoadFactor.generateFrom({ night_power: 20, day_power: 60, peak_power: 100, peak_hours: 8 });
    expect(g).not.toBeNull();
    expect(g?.answerText).toBe("60");
    expect(g?.answerUnit).toBe("%");
    expect(g?.format).toBe("descriptive");
    expect(g?.choices).toBeUndefined();
  });

  it("日負荷曲線と負荷率（20/80/200MW, ピーク4h → 40%）", () => {
    const g = dailyLoadFactor.generateFrom({ night_power: 20, day_power: 80, peak_power: 200, peak_hours: 4 });
    expect(g?.answerText).toBe("40");
  });

  it("日負荷曲線: ピークが最大でない形状は棄却", () => {
    expect(dailyLoadFactor.generateFrom({ night_power: 100, day_power: 60, peak_power: 50, peak_hours: 8 })).toBeNull();
  });

  it("復水器の冷却水温度上昇（560MW, η=0.4, 25t/s → 8K）", () => {
    const g = condenserCoolingWater.generateFrom({ output_power: 560, thermal_efficiency: 0.4, water_flow: 25 });
    expect(g).not.toBeNull();
    expect(g?.answerText).toBe("8");
    expect(g?.answerUnit).toBe("K");
    expect(g?.format).toBe("descriptive");
  });

  it("復水器の冷却水温度上昇（420MW, η=0.5, 10t/s → 10K）", () => {
    const g = condenserCoolingWater.generateFrom({ output_power: 420, thermal_efficiency: 0.5, water_flow: 10 });
    expect(g?.answerText).toBe("10");
  });

  it("ループ配電線の電流分布（L=10, a=2, b=3, 100A/60A → IA=110A）", () => {
    const g = loopDistributionCurrent.generateFrom({ total_length: 10, dist_a: 2, dist_b: 3, load1: 100, load2: 60 });
    expect(g).not.toBeNull();
    expect(g?.answerText).toBe("110");
    expect(g?.answerUnit).toBe("A");
    expect(g?.format).toBe("descriptive");
  });

  it("ループ配電線の電流分布（L=8, a=2, b=2, 40A/80A → IA=70A）", () => {
    const g = loopDistributionCurrent.generateFrom({ total_length: 8, dist_a: 2, dist_b: 2, load1: 40, load2: 80 });
    expect(g?.answerText).toBe("70");
  });

  it("ループ配電線: 負荷点がループ外（a+b≥L）は棄却", () => {
    expect(
      loopDistributionCurrent.generateFrom({ total_length: 8, dist_a: 4, dist_b: 4, load1: 40, load2: 40 }),
    ).toBeNull();
  });

  it("ガバナ特性と負荷分担（200MW/4%と100MW/2%, ΔP=60MW → ΔPA=30MW）", () => {
    const g = governorLoadSharing.generateFrom({
      capacity_a: 200,
      capacity_b: 100,
      regulation_a: 4,
      regulation_b: 2,
      load_increase: 60,
    });
    expect(g).not.toBeNull();
    expect(g?.answerText).toBe("30");
    expect(g?.answerUnit).toBe("MW");
    expect(g?.format).toBe("descriptive");
  });

  it("ガバナ特性と負荷分担（300MW/5%と200MW/5%, ΔP=90MW → ΔPA=54MW）", () => {
    const g = governorLoadSharing.generateFrom({
      capacity_a: 300,
      capacity_b: 200,
      regulation_a: 5,
      regulation_b: 5,
      load_increase: 90,
    });
    expect(g?.answerText).toBe("54");
  });

  it("基準容量換算と三相短絡容量（%ZS=2, 変圧器4.5%@2.5MV·A → 50MV·A）", () => {
    const g = seriesPercentImpedanceFault.generateFrom({
      source_impedance: 2,
      transformer_impedance: 4.5,
      transformer_capacity: 2.5,
    });
    expect(g).not.toBeNull();
    expect(g?.answerText).toBe("50");
    expect(g?.answerUnit).toBe("MV·A");
    expect(g?.format).toBe("descriptive");
  });

  it("基準容量換算と三相短絡容量（%ZS=1, 変圧器6%@2.5MV·A → 40MV·A）", () => {
    const g = seriesPercentImpedanceFault.generateFrom({
      source_impedance: 1,
      transformer_impedance: 6,
      transformer_capacity: 2.5,
    });
    expect(g?.answerText).toBe("40");
  });
});

describe("二種二次・機械制御（descriptive）の閉形式検算", () => {
  it("三相全波整流（線間200V, α=0° → 270V）", () => {
    const g = threePhaseRectifier.generateFrom({ line_voltage: 200, firing_angle: 0 });
    expect(g).not.toBeNull();
    expect(g?.answerText).toBe("270");
    expect(g?.answerUnit).toBe("V");
    expect(g?.format).toBe("descriptive");
  });

  it("三相全波整流（線間440V, α=60° → 297V）", () => {
    const g = threePhaseRectifier.generateFrom({ line_voltage: 440, firing_angle: 60 });
    expect(g?.answerText).toBe("297");
  });

  it("三相全波整流: cos表にない制御角は棄却", () => {
    expect(threePhaseRectifier.generateFrom({ line_voltage: 200, firing_angle: 45 })).toBeNull();
  });

  it("Y-Δ始動（定格30A, 直入5倍 → 50A）", () => {
    const g = starDeltaStarting.generateFrom({ rated_current: 30, direct_ratio: 5 });
    expect(g).not.toBeNull();
    expect(g?.answerText).toBe("50");
    expect(g?.answerUnit).toBe("A");
    expect(g?.format).toBe("descriptive");
  });

  it("Y-Δ始動（定格40A, 直入6倍 → 80A）", () => {
    const g = starDeltaStarting.generateFrom({ rated_current: 40, direct_ratio: 6 });
    expect(g?.answerText).toBe("80");
  });

  it("直流分巻電動機の抵抗制御（110V,20A,Ra=0.5,R=0.5,N1=1000 → 900min⁻¹）", () => {
    const g = dcMotorSpeedResistance.generateFrom({
      terminal_voltage: 110,
      armature_current: 20,
      armature_resistance: 0.5,
      series_resistance: 0.5,
      initial_speed: 1000,
    });
    expect(g).not.toBeNull();
    expect(g?.answerText).toBe("900");
    expect(g?.answerUnit).toBe("min⁻¹");
    expect(g?.format).toBe("descriptive");
  });

  it("直流分巻電動機の抵抗制御（220V,40A,Ra=0.5,R=1.5,N1=1000 → 700min⁻¹）", () => {
    const g = dcMotorSpeedResistance.generateFrom({
      terminal_voltage: 220,
      armature_current: 40,
      armature_resistance: 0.5,
      series_resistance: 1.5,
      initial_speed: 1000,
    });
    expect(g?.answerText).toBe("700");
  });

  it("直流分巻電動機: 逆起電力が負になる過大抵抗は棄却", () => {
    expect(
      dcMotorSpeedResistance.generateFrom({
        terminal_voltage: 110,
        armature_current: 40,
        armature_resistance: 1,
        series_resistance: 2,
        initial_speed: 1000,
      }),
    ).toBeNull();
  });

  it("ラウス安定判別（s(s+1)(s+2) → Kmax=6）", () => {
    const g = routhStabilityLimit.generateFrom({ pole_a: 1, pole_b: 2 });
    expect(g).not.toBeNull();
    expect(g?.answerText).toBe("6");
    expect(g?.format).toBe("descriptive");
  });

  it("ラウス安定判別（s(s+2)(s+3) → Kmax=30）", () => {
    const g = routhStabilityLimit.generateFrom({ pole_a: 2, pole_b: 3 });
    expect(g?.answerText).toBe("30");
  });

  it("昇降圧チョッパ（200V, D=0.6 → 300V）", () => {
    const g = buckBoostChopper.generateFrom({ input_voltage: 200, duty_ratio: 0.6 });
    expect(g).not.toBeNull();
    expect(g?.answerText).toBe("300");
    expect(g?.answerUnit).toBe("V");
    expect(g?.format).toBe("descriptive");
  });

  it("昇降圧チョッパ（240V, D=0.25 → 80V）", () => {
    const g = buckBoostChopper.generateFrom({ input_voltage: 240, duty_ratio: 0.25 });
    expect(g?.answerText).toBe("80");
  });
});

describe("二種一次・機械/理論/電力/法規（numeric）の閉形式検算", () => {
  it("変圧器の全日効率（25kV·A, Pi=0.5, Pc=0.8, 全負荷8h+半負荷8h → 93.75%）", () => {
    const g = allDayEfficiency.generateFrom({
      rated_capacity: 25,
      iron_loss: 0.5,
      copper_loss: 0.8,
      full_hours: 8,
      half_hours: 8,
    });
    expect(g).not.toBeNull();
    expect(g?.answerText).toBe("93.75");
    expect(g?.answerUnit).toBe("%");
    expect(g?.format).toBe("numeric");
    expect(g?.choices).toBeUndefined();
  });

  it("変圧器の全日効率（20kV·A, Pi=0.25, Pc=0.4, 全負荷8h+半負荷8h → 96%）", () => {
    const g = allDayEfficiency.generateFrom({
      rated_capacity: 20,
      iron_loss: 0.25,
      copper_loss: 0.4,
      full_hours: 8,
      half_hours: 8,
    });
    expect(g?.answerText).toBe("96");
  });

  it("ヒートポンプの消費電力（9kW, COP=4 → 2.25kW）", () => {
    const g = heatPumpCop.generateFrom({ heat_output: 9, cop: 4 });
    expect(g).not.toBeNull();
    expect(g?.answerText).toBe("2.25");
    expect(g?.answerUnit).toBe("kW");
    expect(g?.format).toBe("numeric");
  });

  it("ヒートポンプの消費電力（12kW, COP=5 → 2.4kW）", () => {
    const g = heatPumpCop.generateFrom({ heat_output: 12, cop: 5 });
    expect(g?.answerText).toBe("2.4");
  });

  it("誘導電動機の効率（P1=50, Ps=2, s=0.025, Pm=1.5 → 90.6%）", () => {
    const g = inductionMotorEfficiency.generateFrom({ input_power: 50, stator_loss: 2, slip: 0.025, mech_loss: 1.5 });
    expect(g).not.toBeNull();
    expect(g?.answerText).toBe("90.6");
    expect(g?.answerUnit).toBe("%");
    expect(g?.format).toBe("numeric");
  });

  it("誘導電動機の効率（P1=100, Ps=4, s=0.05, Pm=2 → 89.2%）", () => {
    const g = inductionMotorEfficiency.generateFrom({ input_power: 100, stator_loss: 4, slip: 0.05, mech_loss: 2 });
    expect(g?.answerText).toBe("89.2");
  });

  it("釣合いおもり付き巻上機（1000kg−500kg, 2m/s, η=0.8 → 12.25kW）", () => {
    const g = elevatorCounterweightPower.generateFrom({
      cage_mass: 1000,
      counter_mass: 500,
      speed: 2,
      efficiency: 0.8,
    });
    expect(g).not.toBeNull();
    expect(g?.answerText).toBe("12.25");
    expect(g?.answerUnit).toBe("kW");
    expect(g?.format).toBe("numeric");
  });

  it("釣合いおもり付き巻上機（1500kg−750kg, 1m/s, η=0.7 → 10.5kW）", () => {
    const g = elevatorCounterweightPower.generateFrom({
      cage_mass: 1500,
      counter_mass: 750,
      speed: 1,
      efficiency: 0.7,
    });
    expect(g?.answerText).toBe("10.5");
  });

  it("釣合いおもり付き巻上機: おもりがかごより重い条件は棄却", () => {
    expect(
      elevatorCounterweightPower.generateFrom({ cage_mass: 1000, counter_mass: 1000, speed: 1, efficiency: 0.8 }),
    ).toBeNull();
  });

  it("誘電体を半分挿入したコンデンサ（C0=3μF, εr=2 → 4μF）", () => {
    const g = partialDielectricCapacitor.generateFrom({ base_capacitance: 3, relative_permittivity: 2 });
    expect(g).not.toBeNull();
    expect(g?.answerText).toBe("4");
    expect(g?.answerUnit).toBe("μF");
    expect(g?.format).toBe("numeric");
  });

  it("誘電体を半分挿入したコンデンサ（C0=4μF, εr=3 → 6μF）", () => {
    const g = partialDielectricCapacitor.generateFrom({ base_capacitance: 4, relative_permittivity: 3 });
    expect(g?.answerText).toBe("6");
  });

  it("交流ブリッジ（R2=100, R3=200, C4=0.5μF → 10mH）", () => {
    const g = acBridgeBalance.generateFrom({ resistance_p: 100, resistance_q: 200, capacitance: 0.5 });
    expect(g).not.toBeNull();
    expect(g?.answerText).toBe("10");
    expect(g?.answerUnit).toBe("mH");
    expect(g?.format).toBe("numeric");
  });

  it("交流ブリッジ（R2=1000, R3=500, C4=0.2μF → 100mH）", () => {
    const g = acBridgeBalance.generateFrom({ resistance_p: 1000, resistance_q: 500, capacitance: 0.2 });
    expect(g?.answerText).toBe("100");
  });

  it("和動・差動接続（La=60, Lb=20 → M=10mH）", () => {
    const g = coupledInductorConnection.generateFrom({ series_aiding: 60, series_opposing: 20 });
    expect(g).not.toBeNull();
    expect(g?.answerText).toBe("10");
    expect(g?.answerUnit).toBe("mH");
    expect(g?.format).toBe("numeric");
  });

  it("和動・差動接続（La=40, Lb=30 → M=2.5mH）", () => {
    const g = coupledInductorConnection.generateFrom({ series_aiding: 40, series_opposing: 30 });
    expect(g?.answerText).toBe("2.5");
  });

  it("和動・差動接続: 和動≤差動は棄却", () => {
    expect(coupledInductorConnection.generateFrom({ series_aiding: 30, series_opposing: 30 })).toBeNull();
  });

  it("コンデンサの電荷再配分（C1=2μF@100V + C2=3μF → 40V）", () => {
    const g = chargeRedistribution.generateFrom({
      charged_capacitance: 2,
      uncharged_capacitance: 3,
      initial_voltage: 100,
    });
    expect(g).not.toBeNull();
    expect(g?.answerText).toBe("40");
    expect(g?.answerUnit).toBe("V");
    expect(g?.format).toBe("numeric");
  });

  it("コンデンサの電荷再配分（C1=6μF@120V + C2=2μF → 90V）", () => {
    const g = chargeRedistribution.generateFrom({
      charged_capacitance: 6,
      uncharged_capacitance: 2,
      initial_voltage: 120,
    });
    expect(g?.answerText).toBe("90");
  });

  it("変流器と過電流継電器（200/5A, タップ4A → 160A）", () => {
    const g = currentTransformerRelay.generateFrom({ ct_primary: 200, relay_tap: 4 });
    expect(g).not.toBeNull();
    expect(g?.answerText).toBe("160");
    expect(g?.answerUnit).toBe("A");
    expect(g?.format).toBe("numeric");
  });

  it("変流器と過電流継電器（300/5A, タップ6A → 360A）", () => {
    const g = currentTransformerRelay.generateFrom({ ct_primary: 300, relay_tap: 6 });
    expect(g?.answerText).toBe("360");
  });

  it("力率改善による余裕容量（300kV·A, 240kW, cosθ2=0.95 → 45kW）", () => {
    const g = pfImprovementCapacity.generateFrom({
      transformer_capacity: 300,
      load_power: 240,
      power_factor_after: 0.95,
    });
    expect(g).not.toBeNull();
    expect(g?.answerText).toBe("45");
    expect(g?.answerUnit).toBe("kW");
    expect(g?.format).toBe("numeric");
  });

  it("力率改善による余裕容量（100kV·A, 60kW, cosθ2=0.8 → 20kW）", () => {
    const g = pfImprovementCapacity.generateFrom({
      transformer_capacity: 100,
      load_power: 60,
      power_factor_after: 0.8,
    });
    expect(g?.answerText).toBe("20");
  });

  it("力率改善: 既に容量不足の条件は棄却", () => {
    expect(
      pfImprovementCapacity.generateFrom({ transformer_capacity: 100, load_power: 120, power_factor_after: 1 }),
    ).toBeNull();
  });

  it("B種接地の対地電位上昇（Ig=3A, RB=30Ω → 90V）", () => {
    const g = groundFaultPotentialRise.generateFrom({ ground_fault_current: 3, grounding_resistance: 30 });
    expect(g).not.toBeNull();
    expect(g?.answerText).toBe("90");
    expect(g?.answerUnit).toBe("V");
    expect(g?.format).toBe("numeric");
  });

  it("B種接地の対地電位上昇（Ig=5A, RB=20Ω → 100V）", () => {
    const g = groundFaultPotentialRise.generateFrom({ ground_fault_current: 5, grounding_resistance: 20 });
    expect(g?.answerText).toBe("100");
  });

  it("B種接地: 上昇が150Vを超える組（違法な施設条件）は棄却", () => {
    expect(groundFaultPotentialRise.generateFrom({ ground_fault_current: 10, grounding_resistance: 20 })).toBeNull();
  });
});

describe("新テンプレ21種: 多数 seed で綺麗な有限数のみ生成", () => {
  const all: Template[] = [
    dailyLoadFactor,
    condenserCoolingWater,
    loopDistributionCurrent,
    governorLoadSharing,
    seriesPercentImpedanceFault,
    threePhaseRectifier,
    starDeltaStarting,
    dcMotorSpeedResistance,
    routhStabilityLimit,
    buckBoostChopper,
    allDayEfficiency,
    heatPumpCop,
    inductionMotorEfficiency,
    elevatorCounterweightPower,
    partialDielectricCapacitor,
    acBridgeBalance,
    coupledInductorConnection,
    chargeRedistribution,
    currentTransformerRelay,
    pfImprovementCapacity,
    groundFaultPotentialRise,
  ];
  for (const t of all) {
    it(`${t.topic}: クリーン生成`, () => {
      expectCleanGeneration(t, 20260722);
    });
  }
});
