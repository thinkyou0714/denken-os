/**
 * 拡充テンプレート（22種）の閉形式を固定値で検算する。
 * generateFrom() で決定論的に1問を組み立て、コード算出の正解が想定どおりかを確認する。
 * （手検算 → ここに固定 → 回帰防止。template-invariants が「綺麗・整合」を横断で保証する。）
 */
import { describe, expect, it } from "vitest";
import {
  buckChopper,
  dcMotorEmf,
  firstOrderControl,
  hydroPowerOutput,
  inductionPowerBalance,
  inductionProportionalShift,
  insulationTestVoltage,
  lightingDesign,
  maxPowerTransfer,
  multiplierResistor,
  parallelPlateField,
  percentImpedanceConversion,
  percentImpedanceShortCircuit,
  powerFactorCorrection,
  pumpMotorInput,
  rcTimeConstant,
  reactivePowerCompensation,
  sagTension,
  shortCircuitCapacity,
  shortCircuitRatio,
  shuntResistor,
  singlePhaseVoltageDrop,
  synchronousGeneratorOutput,
  thermalEfficiency,
  transformerEfficiency,
  transformerTurnsRatio,
  transmissionLoss,
  wheatstoneBridge,
} from "../../lib/engine/templates/index.js";

describe("拡充テンプレートの閉形式（固定値検算）", () => {
  it("理論: 最大電力 E²/(4R)（E=40,R=4 → 100W）", () => {
    expect(maxPowerTransfer.generateFrom({ emf: 40, internal_resistance: 4 })!.answerText).toBe("100");
  });

  it("理論: RC時定数 τ=RC（10kΩ,4μF → 40ms）", () => {
    expect(rcTimeConstant.generateFrom({ resistance: 10, capacitance: 4 })!.answerText).toBe("40");
  });

  it("理論: ブリッジ平衡 Rx=R2R3/R1（100,200,150 → 300Ω）", () => {
    expect(wheatstoneBridge.generateFrom({ r1: 100, r2: 200, r3: 150 })!.answerText).toBe("300");
  });

  it("電力: 力率改善 Qc=P(tanθ1-tanθ2)（240kW,0.8→1.0 → 180kvar）", () => {
    const g = powerFactorCorrection.generateFrom({
      load_power: 240,
      power_factor_before: 0.8,
      power_factor_after: 1.0,
    });
    expect(g!.answerText).toBe("180");
    expect(g!.format).toBe("numeric");
  });

  it("電力: 短絡電流 Is=In·100/%Z（200A,5% → 4000A）", () => {
    expect(percentImpedanceShortCircuit.generateFrom({ rated_current: 200, percent_impedance: 5 })!.answerText).toBe(
      "4000",
    );
  });

  it("電力: 送電損失 3I²R（50A,2Ω → 15kW）", () => {
    expect(transmissionLoss.generateFrom({ line_current: 50, line_resistance: 2 })!.answerText).toBe("15");
  });

  it("電力: 単相2線電圧降下 2I(Rcosθ+Xsinθ)（10A,0.3,0.4,pf0.8 → 9.6V）", () => {
    const g = singlePhaseVoltageDrop.generateFrom({
      line_current: 10,
      resistance: 0.3,
      reactance: 0.4,
      power_factor: 0.8,
    });
    expect(g!.answerText).toBe("9.6");
  });

  it("機械: 変圧器効率 Pout/(Pout+Pi+Pc)（900,40,60 → 90%）", () => {
    expect(transformerEfficiency.generateFrom({ output_power: 900, iron_loss: 40, copper_loss: 60 })!.answerText).toBe(
      "90",
    );
  });

  it("機械: 直流機 逆起電力 V-IaRa（200,50,0.2 → 190V）", () => {
    expect(
      dcMotorEmf.generateFrom({ terminal_voltage: 200, armature_current: 50, armature_resistance: 0.2 })!.answerText,
    ).toBe("190");
  });

  it("機械: 短絡比 100/%Zs（125% → 0.8）", () => {
    expect(shortCircuitRatio.generateFrom({ percent_synchronous_impedance: 125 })!.answerText).toBe("0.8");
  });

  it("機械: 誘導機 二次効率 Pm=P2(1-s)（10kW,s0.05 → 9.5kW）", () => {
    expect(inductionPowerBalance.generateFrom({ secondary_input: 10, slip: 0.05 })!.answerText).toBe("9.5");
  });

  it("機械: 変圧器 巻数比 I2=I1·V1/V2（6600/200,I1=5 → 165A）", () => {
    expect(
      transformerTurnsRatio.generateFrom({ primary_voltage: 6600, secondary_voltage: 200, primary_current: 5 })!
        .answerText,
    ).toBe("165");
  });

  it("法規: たるみ D=wS²/(8T)（20N/m,100m,25000N → 1m）", () => {
    expect(sagTension.generateFrom({ unit_load: 20, span: 100, tension: 25000 })!.answerText).toBe("1");
  });

  it("法規: 絶縁耐力試験電圧（6600V → 10350V）", () => {
    expect(insulationTestVoltage.generateFrom({ nominal_voltage: 6600 })!.answerText).toBe("10350");
  });

  it("二次機械制御: 同期発電機出力 3VEsinδ/Xs（200,300,Xs20,δ90 → 9kW, descriptive）", () => {
    const g = synchronousGeneratorOutput.generateFrom({
      phase_voltage: 200,
      induced_emf: 300,
      synchronous_reactance: 20,
      load_angle: 90,
    });
    expect(g!.answerText).toBe("9");
    expect(g!.format).toBe("descriptive");
  });

  it("二次機械制御: 降圧チョッパ Vo=DVi（200V,D0.6 → 120V）", () => {
    expect(buckChopper.generateFrom({ input_voltage: 200, duty_ratio: 0.6 })!.answerText).toBe("120");
  });

  it("二次機械制御: 一次遅れ定常値 KA（K5,A4 → 20）", () => {
    expect(firstOrderControl.generateFrom({ gain: 5, step_size: 4, time_constant: 1 })!.answerText).toBe("20");
  });

  it("二次機械制御: 比例推移 R=r2(s2-s1)/s1（0.5,0.05,0.15 → 1Ω）", () => {
    expect(
      inductionProportionalShift.generateFrom({ secondary_resistance: 0.5, slip_before: 0.05, slip_after: 0.15 })!
        .answerText,
    ).toBe("1");
  });

  it("二次電力管理: 調相設備容量 Qc=P(tanθ1-tanθ2)（1200kW,0.8→1.0 → 900kvar, descriptive）", () => {
    const g = reactivePowerCompensation.generateFrom({
      load_power: 1200,
      power_factor_before: 0.8,
      power_factor_after: 1.0,
    });
    expect(g!.answerText).toBe("900");
    expect(g!.format).toBe("descriptive");
  });

  it("二次電力管理: 水力出力 9.8QHη（10,100,0.9 → 8820kW）", () => {
    expect(hydroPowerOutput.generateFrom({ flow: 10, head: 100, efficiency: 0.9 })!.answerText).toBe("8820");
  });

  it("二次電力管理: 熱効率 3600/q×100（7200 → 50%）", () => {
    expect(thermalEfficiency.generateFrom({ heat_rate: 7200 })!.answerText).toBe("50");
  });

  it("二次電力管理: 短絡容量 Pbase·100/%Z（10MVA,5% → 200MVA）", () => {
    expect(shortCircuitCapacity.generateFrom({ base_capacity: 10, percent_impedance: 5 })!.answerText).toBe("200");
  });

  it("理論: 分流器 R_s=r/(m-1)（r=9,m=10 → 1Ω）", () => {
    expect(shuntResistor.generateFrom({ internal_resistance: 9, multiplier: 10 })!.answerText).toBe("1");
  });

  it("理論: 倍率器 R_m=r(m-1)（r=10,m=5 → 40Ω）", () => {
    expect(multiplierResistor.generateFrom({ internal_resistance: 10, multiplier: 5 })!.answerText).toBe("40");
  });

  it("理論: 平行平板電界 E=V/d（200V,2mm → 100kV/m）", () => {
    expect(parallelPlateField.generateFrom({ voltage: 200, gap: 2 })!.answerText).toBe("100");
  });

  it("電力: %Z容量換算 %Z2=%Z1(P2/P1)（5%,10→50MVA → 25%）", () => {
    expect(
      percentImpedanceConversion.generateFrom({ percent_impedance: 5, base_capacity: 10, target_capacity: 50 })!
        .answerText,
    ).toBe("25");
  });

  it("機械: 揚水動力 P=9.8QH/η（2,50,0.98 → 1000kW）", () => {
    expect(pumpMotorInput.generateFrom({ flow: 2, head: 50, efficiency: 0.98 })!.answerText).toBe("1000");
  });

  it("機械: 照明灯数 N=EA/(FUM)（500,100,5000,0.5,0.8 → 25灯）", () => {
    expect(
      lightingDesign.generateFrom({ illuminance: 500, area: 100, lumen: 5000, utilization: 0.5, maintenance: 0.8 })!
        .answerText,
    ).toBe("25");
  });
});
