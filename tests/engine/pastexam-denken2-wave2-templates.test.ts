/**
 * pastexam-denken2-wave2-templates.test.ts — 二次試験対策強化（第2弾）で追加した
 * 18テンプレ（電力管理8・機械制御8・機械1・電力1）の閉形式検算とプロパティ検証。
 *
 * 各テンプレについて:
 *   - generateFrom(代表入力) の answerText / answerUnit / format が固定値どおり
 *   - 不成立条件（物理的前提を破る入力）が null で棄却される
 *   - generate(seededRng) を回した非null draw すべてで answerText が綺麗な有限数
 * （横断的な物理成立・レンジ・解説整合は tests/engine/template-invariants.test.ts が担保）
 */
import { describe, expect, it } from "vitest";
import { isCleanAnswer } from "../../lib/engine/clean.js";
import { balancerCurrent } from "../../lib/engine/templates/balancer-current.js";
import { chopperCurrentRipple } from "../../lib/engine/templates/chopper-current-ripple.js";
import { closedLoopTimeConstant } from "../../lib/engine/templates/closed-loop-time-constant.js";
import { currentLimitingReactor } from "../../lib/engine/templates/current-limiting-reactor.js";
import { dcMotorFieldWeakening } from "../../lib/engine/templates/dc-motor-field-weakening.js";
import { disturbanceSteadyState } from "../../lib/engine/templates/disturbance-steady-state.js";
import { ironLossFrequency } from "../../lib/engine/templates/iron-loss-frequency.js";
import { lossReductionPf } from "../../lib/engine/templates/loss-reduction-pf.js";
import { massDefectEnergy } from "../../lib/engine/templates/mass-defect-energy.js";
import { maxTorqueStartResistance } from "../../lib/engine/templates/max-torque-start-resistance.js";
import { pumpedStorageGenerationTime } from "../../lib/engine/templates/pumped-storage-generation-time.js";
import { pumpingRequiredPower } from "../../lib/engine/templates/pumping-required-power.js";
import { reserveMargin } from "../../lib/engine/templates/reserve-margin.js";
import { stationServiceEfficiency } from "../../lib/engine/templates/station-service-efficiency.js";
import { switchingLoss } from "../../lib/engine/templates/switching-loss.js";
import { synchronizingCurrent } from "../../lib/engine/templates/synchronizing-current.js";
import { systemFrequencyConstant } from "../../lib/engine/templates/system-frequency-constant.js";
import type { Template } from "../../lib/engine/templates/types.js";
import { vfControlSpeed } from "../../lib/engine/templates/vf-control-speed.js";
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

describe("第2弾・電力管理（descriptive）の閉形式検算", () => {
  it("揚水に必要な電動機入力（20m³/s, 100m, η=0.7 → 28MW）", () => {
    const g = pumpingRequiredPower.generateFrom({ flow_rate: 20, total_head: 100, pump_efficiency: 0.7 });
    expect(g).not.toBeNull();
    expect(g?.answerText).toBe("28");
    expect(g?.answerUnit).toBe("MW");
    expect(g?.format).toBe("descriptive");
    expect(g?.choices).toBeUndefined();
  });

  it("揚水に必要な電動機入力（25m³/s, 200m, η=0.8 → 61.25MW）", () => {
    const g = pumpingRequiredPower.generateFrom({ flow_rate: 25, total_head: 200, pump_efficiency: 0.8 });
    expect(g?.answerText).toBe("61.25");
  });

  it("所内率と送電端熱効率（ηg=40%, L=0.05 → 38%）", () => {
    const g = stationServiceEfficiency.generateFrom({ generator_end_efficiency: 40, station_service_rate: 0.05 });
    expect(g).not.toBeNull();
    expect(g?.answerText).toBe("38");
    expect(g?.answerUnit).toBe("%");
    expect(g?.format).toBe("descriptive");
  });

  it("所内率と送電端熱効率（ηg=45%, L=0.06 → 42.3%）", () => {
    const g = stationServiceEfficiency.generateFrom({ generator_end_efficiency: 45, station_service_rate: 0.06 });
    expect(g?.answerText).toBe("42.3");
  });

  it("単相3線式のバランサ電流（60A/20A → 20A）", () => {
    const g = balancerCurrent.generateFrom({ load_current_a: 60, load_current_b: 20 });
    expect(g).not.toBeNull();
    expect(g?.answerText).toBe("20");
    expect(g?.answerUnit).toBe("A");
    expect(g?.format).toBe("descriptive");
  });

  it("単相3線式のバランサ電流（100A/40A → 30A）", () => {
    const g = balancerCurrent.generateFrom({ load_current_a: 100, load_current_b: 40 });
    expect(g?.answerText).toBe("30");
  });

  it("バランサ: 平衡負荷（Ia=Ib）は棄却", () => {
    expect(balancerCurrent.generateFrom({ load_current_a: 40, load_current_b: 40 })).toBeNull();
  });

  it("系統周波数特性（10000MW, K=10, 脱落400MW → 0.4Hz）", () => {
    const g = systemFrequencyConstant.generateFrom({
      system_capacity: 10000,
      frequency_constant: 10,
      lost_power: 400,
    });
    expect(g).not.toBeNull();
    expect(g?.answerText).toBe("0.4");
    expect(g?.answerUnit).toBe("Hz");
    expect(g?.format).toBe("descriptive");
  });

  it("系統周波数特性（5000MW, K=12, 脱落300MW → 0.5Hz）", () => {
    const g = systemFrequencyConstant.generateFrom({ system_capacity: 5000, frequency_constant: 12, lost_power: 300 });
    expect(g?.answerText).toBe("0.5");
  });

  it("系統周波数特性: 低下1Hz超（非現実領域）は棄却", () => {
    expect(
      systemFrequencyConstant.generateFrom({ system_capacity: 5000, frequency_constant: 8, lost_power: 600 }),
    ).toBeNull();
  });

  it("力率改善による損失低減（100kW, 0.6→0.8 → 56.25kW）", () => {
    const g = lossReductionPf.generateFrom({ loss_before: 100, power_factor_before: 0.6, power_factor_after: 0.8 });
    expect(g).not.toBeNull();
    expect(g?.answerText).toBe("56.25");
    expect(g?.answerUnit).toBe("kW");
    expect(g?.format).toBe("descriptive");
  });

  it("力率改善による損失低減（200kW, 0.8→1 → 128kW）", () => {
    const g = lossReductionPf.generateFrom({ loss_before: 200, power_factor_before: 0.8, power_factor_after: 1 });
    expect(g?.answerText).toBe("128");
  });

  it("力率改善による損失低減: 力率悪化（cosθ2≤cosθ1）は棄却", () => {
    expect(
      lossReductionPf.generateFrom({ loss_before: 100, power_factor_before: 0.8, power_factor_after: 0.6 }),
    ).toBeNull();
  });

  it("供給予備率（3000+1500+500 vs 4000MW → 25%）", () => {
    const g = reserveMargin.generateFrom({
      thermal_capacity: 3000,
      hydro_capacity: 1500,
      purchased_power: 500,
      peak_demand: 4000,
    });
    expect(g).not.toBeNull();
    expect(g?.answerText).toBe("25");
    expect(g?.answerUnit).toBe("%");
    expect(g?.format).toBe("descriptive");
  });

  it("供給予備率（4000+1500+500 vs 5000MW → 20%）", () => {
    const g = reserveMargin.generateFrom({
      thermal_capacity: 4000,
      hydro_capacity: 1500,
      purchased_power: 500,
      peak_demand: 5000,
    });
    expect(g?.answerText).toBe("20");
  });

  it("供給予備率: 供給力不足は棄却", () => {
    expect(
      reserveMargin.generateFrom({
        thermal_capacity: 2000,
        hydro_capacity: 1000,
        purchased_power: 500,
        peak_demand: 4000,
      }),
    ).toBeNull();
  });

  it("限流リアクトル（%ZS=2, 目標200MV·A → 3%）", () => {
    const g = currentLimitingReactor.generateFrom({ source_impedance: 2, max_fault_mva: 200 });
    expect(g).not.toBeNull();
    expect(g?.answerText).toBe("3");
    expect(g?.answerUnit).toBe("%");
    expect(g?.format).toBe("descriptive");
  });

  it("限流リアクトル（%ZS=1.25, 目標400MV·A → 1.25%）", () => {
    const g = currentLimitingReactor.generateFrom({ source_impedance: 1.25, max_fault_mva: 400 });
    expect(g?.answerText).toBe("1.25");
  });

  it("限流リアクトル: 既に目標以下（挿入不要）は棄却", () => {
    expect(currentLimitingReactor.generateFrom({ source_impedance: 2.5, max_fault_mva: 500 })).toBeNull();
  });

  it("揚水発電の発電可能時間（200MW×6h, η=0.7, 出力210MW → 4h）", () => {
    const g = pumpedStorageGenerationTime.generateFrom({
      pumping_power: 200,
      pumping_hours: 6,
      overall_efficiency: 0.7,
      generating_power: 210,
    });
    expect(g).not.toBeNull();
    expect(g?.answerText).toBe("4");
    expect(g?.answerUnit).toBe("h");
    expect(g?.format).toBe("descriptive");
  });

  it("揚水発電の発電可能時間（300MW×8h, η=0.75, 出力300MW → 6h）", () => {
    const g = pumpedStorageGenerationTime.generateFrom({
      pumping_power: 300,
      pumping_hours: 8,
      overall_efficiency: 0.75,
      generating_power: 300,
    });
    expect(g?.answerText).toBe("6");
  });
});

describe("第2弾・機械制御（descriptive）の閉形式検算", () => {
  it("V/f制御（50Hz→40Hz, 4極, N1=1440 → 1140min⁻¹）", () => {
    const g = vfControlSpeed.generateFrom({ freq_before: 50, freq_after: 40, poles: 4, speed_before: 1440 });
    expect(g).not.toBeNull();
    expect(g?.answerText).toBe("1140");
    expect(g?.answerUnit).toBe("min⁻¹");
    expect(g?.format).toBe("descriptive");
  });

  it("V/f制御（60Hz→70Hz, 6極, N1=1176 → 1376min⁻¹）", () => {
    const g = vfControlSpeed.generateFrom({ freq_before: 60, freq_after: 70, poles: 6, speed_before: 1176 });
    expect(g?.answerText).toBe("1376");
  });

  it("V/f制御: 周波数変更なしは棄却", () => {
    expect(vfControlSpeed.generateFrom({ freq_before: 50, freq_after: 50, poles: 4, speed_before: 1440 })).toBeNull();
  });

  it("始動時最大トルクの挿入抵抗（r2=0.2, smT=0.2 → 0.8Ω）", () => {
    const g = maxTorqueStartResistance.generateFrom({ secondary_resistance: 0.2, max_torque_slip: 0.2 });
    expect(g).not.toBeNull();
    expect(g?.answerText).toBe("0.8");
    expect(g?.answerUnit).toBe("Ω");
    expect(g?.format).toBe("descriptive");
  });

  it("始動時最大トルクの挿入抵抗（r2=0.5, smT=0.25 → 1.5Ω）", () => {
    const g = maxTorqueStartResistance.generateFrom({ secondary_resistance: 0.5, max_torque_slip: 0.25 });
    expect(g?.answerText).toBe("1.5");
  });

  it("界磁弱め制御（N1=1500, k=0.75, Ia=30 → 2000min⁻¹）", () => {
    const g = dcMotorFieldWeakening.generateFrom({ initial_speed: 1500, flux_ratio: 0.75, armature_current: 30 });
    expect(g).not.toBeNull();
    expect(g?.answerText).toBe("2000");
    expect(g?.answerUnit).toBe("min⁻¹");
    expect(g?.format).toBe("descriptive");
  });

  it("界磁弱め制御（N1=1200, k=0.8, Ia=40 → 1500min⁻¹）", () => {
    const g = dcMotorFieldWeakening.generateFrom({ initial_speed: 1200, flux_ratio: 0.8, armature_current: 40 });
    expect(g?.answerText).toBe("1500");
  });

  it("界磁弱め制御: 界磁強め（k≥1）は棄却", () => {
    expect(dcMotorFieldWeakening.generateFrom({ initial_speed: 1200, flux_ratio: 1, armature_current: 40 })).toBeNull();
  });

  it("チョッパ電流リプル（200V, D=0.5, 1mH, 10kHz → 5A）", () => {
    const g = chopperCurrentRipple.generateFrom({
      input_voltage: 200,
      duty_ratio: 0.5,
      inductance: 1,
      switching_frequency: 10,
    });
    expect(g).not.toBeNull();
    expect(g?.answerText).toBe("5");
    expect(g?.answerUnit).toBe("A");
    expect(g?.format).toBe("descriptive");
  });

  it("チョッパ電流リプル（400V, D=0.25, 0.5mH, 20kHz → 7.5A）", () => {
    const g = chopperCurrentRipple.generateFrom({
      input_voltage: 400,
      duty_ratio: 0.25,
      inductance: 0.5,
      switching_frequency: 20,
    });
    expect(g?.answerText).toBe("7.5");
  });

  it("外乱に対する定常偏差（d=10, K=4 → 2）", () => {
    const g = disturbanceSteadyState.generateFrom({ disturbance: 10, proportional_gain: 4 });
    expect(g).not.toBeNull();
    expect(g?.answerText).toBe("2");
    expect(g?.format).toBe("descriptive");
  });

  it("外乱に対する定常偏差（d=50, K=99 → 0.5）", () => {
    const g = disturbanceSteadyState.generateFrom({ disturbance: 50, proportional_gain: 99 });
    expect(g?.answerText).toBe("0.5");
  });

  it("並行運転の循環電流（ΔE=300V, Xs=2.5Ω → 60A）", () => {
    const g = synchronizingCurrent.generateFrom({ emf_difference: 300, synchronous_reactance: 2.5 });
    expect(g).not.toBeNull();
    expect(g?.answerText).toBe("60");
    expect(g?.answerUnit).toBe("A");
    expect(g?.format).toBe("descriptive");
  });

  it("並行運転の循環電流（ΔE=150V, Xs=3Ω → 25A）", () => {
    const g = synchronizingCurrent.generateFrom({ emf_difference: 150, synchronous_reactance: 3 });
    expect(g?.answerText).toBe("25");
  });

  it("スイッチング損失（600V, 100A, 4μs, 5kHz → 600W）", () => {
    const g = switchingLoss.generateFrom({
      blocking_voltage: 600,
      on_current: 100,
      switching_time: 4,
      switching_frequency: 5,
    });
    expect(g).not.toBeNull();
    expect(g?.answerText).toBe("600");
    expect(g?.answerUnit).toBe("W");
    expect(g?.format).toBe("descriptive");
  });

  it("スイッチング損失（400V, 50A, 2μs, 10kHz → 200W）", () => {
    const g = switchingLoss.generateFrom({
      blocking_voltage: 400,
      on_current: 50,
      switching_time: 2,
      switching_frequency: 10,
    });
    expect(g?.answerText).toBe("200");
  });

  it("時定数短縮（T=10s, K=4 → 2s）", () => {
    const g = closedLoopTimeConstant.generateFrom({ open_loop_time_constant: 10, proportional_gain: 4 });
    expect(g).not.toBeNull();
    expect(g?.answerText).toBe("2");
    expect(g?.answerUnit).toBe("s");
    expect(g?.format).toBe("descriptive");
  });

  it("時定数短縮（T=5s, K=19 → 0.25s）", () => {
    const g = closedLoopTimeConstant.generateFrom({ open_loop_time_constant: 5, proportional_gain: 19 });
    expect(g?.answerText).toBe("0.25");
  });
});

describe("第2弾・一次（numeric）の閉形式検算", () => {
  it("周波数変更後の鉄損（50→60Hz, Ph=300W, Pe=250W → 500W）", () => {
    const g = ironLossFrequency.generateFrom({ freq_before: 50, freq_after: 60, hysteresis_loss: 300, eddy_loss: 250 });
    expect(g).not.toBeNull();
    expect(g?.answerText).toBe("500");
    expect(g?.answerUnit).toBe("W");
    expect(g?.format).toBe("numeric");
    expect(g?.choices).toBeUndefined();
  });

  it("周波数変更後の鉄損（60→50Hz, Ph=200W, Pe=250W → 490W）", () => {
    const g = ironLossFrequency.generateFrom({ freq_before: 60, freq_after: 50, hysteresis_loss: 200, eddy_loss: 250 });
    expect(g?.answerText).toBe("490");
  });

  it("鉄損: 周波数変更なしは棄却", () => {
    expect(
      ironLossFrequency.generateFrom({ freq_before: 50, freq_after: 50, hysteresis_loss: 300, eddy_loss: 250 }),
    ).toBeNull();
  });

  it("質量欠損と発電電力量（0.1g, η=0.32 → 800MW·h）", () => {
    const g = massDefectEnergy.generateFrom({ mass_defect: 0.1, thermal_efficiency: 0.32 });
    expect(g).not.toBeNull();
    expect(g?.answerText).toBe("800");
    expect(g?.answerUnit).toBe("MW·h");
    expect(g?.format).toBe("numeric");
  });

  it("質量欠損と発電電力量（0.5g, η=0.36 → 4500MW·h）", () => {
    const g = massDefectEnergy.generateFrom({ mass_defect: 0.5, thermal_efficiency: 0.36 });
    expect(g?.answerText).toBe("4500");
  });
});

describe("第2弾テンプレ18種: 多数 seed で綺麗な有限数のみ生成", () => {
  const all: Template[] = [
    pumpingRequiredPower,
    stationServiceEfficiency,
    balancerCurrent,
    systemFrequencyConstant,
    lossReductionPf,
    reserveMargin,
    currentLimitingReactor,
    pumpedStorageGenerationTime,
    vfControlSpeed,
    maxTorqueStartResistance,
    dcMotorFieldWeakening,
    chopperCurrentRipple,
    disturbanceSteadyState,
    synchronizingCurrent,
    switchingLoss,
    closedLoopTimeConstant,
    ironLossFrequency,
    massDefectEnergy,
  ];
  for (const t of all) {
    it(`${t.topic}: クリーン生成`, () => {
      expectCleanGeneration(t, 20260722);
    });
  }
});
