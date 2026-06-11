/**
 * 網羅拡充テンプレート（23種）の閉形式を固定値で検算する。
 * 手検算した期待値を固定し、ソルバの回帰を防ぐ。
 */
import { describe, expect, it } from "vitest";
import {
  batteryCapacity,
  blockDiagramGain,
  conductorLength,
  coulombForce,
  flywheelAcceleration,
  groundingTypes,
  guyWireSafety,
  indoorVoltageLimit,
  inverseSquareIlluminance,
  lossFactor,
  magneticCircuit,
  maxDemandComposite,
  overheadClearance,
  pqVoltageDrop,
  resistanceTemperature,
  rlTimeConstant,
  rotationalPower,
  seriesCapacitance,
  seriesRlCurrent,
  specificSpeed,
  speedRegulation,
  supplyVoltageLimit,
  transformerExcitingCurrent,
  transformerTap,
} from "../../lib/engine/templates/index.js";

describe("理論（固定値検算）", () => {
  it("クーロン力: q=2μC×2μC, r=0.3m → 0.4N", () => {
    // F=9e9×2e-6×2e-6/0.09=0.4
    expect(coulombForce.generateFrom({ charge1: 2, charge2: 2, distance: 0.3 })!.answerText).toBe("0.4");
  });

  it("RL時定数: L=100mH, R=20Ω → 5ms", () => {
    expect(rlTimeConstant.generateFrom({ inductance: 100, resistance: 20 })!.answerText).toBe("5");
  });

  it("直列合成容量: 3μF+6μF → 2μF（和分の積）", () => {
    expect(seriesCapacitance.generateFrom({ cap1: 3, cap2: 6 })!.answerText).toBe("2");
  });

  it("抵抗温度: 100Ω, α=0.004, ΔT=50K → 120Ω", () => {
    expect(
      resistanceTemperature.generateFrom({ resistance_initial: 100, temp_coefficient: 0.004, temp_rise: 50 })!
        .answerText,
    ).toBe("120");
  });

  it("単相直列: V=100, R=3, X=4 → I=20A（cosφ=0.6 を facts に保持）", () => {
    const g = seriesRlCurrent.generateFrom({ voltage: 100, resistance: 3, reactance: 4 })!;
    expect(g.answerText).toBe("20");
    expect(g.facts.pf).toBe(0.6);
  });

  it("磁気回路: N=500, I=2A, Rm=1e6 → 1mWb", () => {
    expect(magneticCircuit.generateFrom({ turns: 500, current: 2, reluctance: 1e6 })!.answerText).toBe("1");
  });
});

describe("電力（固定値検算）", () => {
  it("比速度: H=16m, P=400kW, N=480 → Ns=300（√400=20, 16^1.25=32）", () => {
    expect(specificSpeed.generateFrom({ head: 16, power: 400, speed: 480 })!.answerText).toBe("300");
  });

  it("速度調定率: N0=618, Nn=600 → 3%", () => {
    expect(speedRegulation.generateFrom({ no_load_speed: 618, rated_speed: 600 })!.answerText).toBe("3");
  });

  it("電線実長: S=120m, D=3m → 120.2m（8×9/360=0.2）", () => {
    expect(conductorLength.generateFrom({ span: 120, sag: 3 })!.answerText).toBe("120.2");
  });

  it("電圧降下PQ式: P=2000kW,Q=1500kvar,R=2,X=4,V=20kV → 500V", () => {
    // (2000×2+1500×4)/20 = 10000/20 = 500
    expect(
      pqVoltageDrop.generateFrom({
        active_power: 2000,
        reactive_power: 1500,
        resistance: 2,
        reactance: 4,
        voltage: 20,
      })!.answerText,
    ).toBe("500");
  });

  it("タップ切換: V1=6600, タップ6000, 定格210V → 231V", () => {
    expect(
      transformerTap.generateFrom({ primary_voltage: 6600, tap_voltage: 6000, secondary_rated: 210 })!.answerText,
    ).toBe("231");
  });
});

describe("機械（固定値検算）", () => {
  it("回転体出力: ω=100rad/s, T=50N·m → 5kW", () => {
    expect(rotationalPower.generateFrom({ angular_velocity: 100, torque: 50 })!.answerText).toBe("5");
  });

  it("蓄電池容量: 10A×5h → 50Ah", () => {
    expect(batteryCapacity.generateFrom({ current: 10, hours: 5 })!.answerText).toBe("50");
  });

  it("励磁電流: V=200, Pi=600W, I0=5A → Iμ=4A（Iw=3）", () => {
    const g = transformerExcitingCurrent.generateFrom({ voltage: 200, iron_loss: 600, no_load_current: 5 })!;
    expect(g.answerText).toBe("4");
    expect(g.facts.iw).toBe(3);
  });

  it("はずみ車: GD²=750, N=1500, T=300 → 10s", () => {
    // 750×1500/(375×300)=10
    expect(flywheelAcceleration.generateFrom({ flywheel_effect: 750, speed: 1500, torque: 300 })!.answerText).toBe(
      "10",
    );
  });

  it("逆二乗則: I=400cd, r=2m → 100lx", () => {
    expect(inverseSquareIlluminance.generateFrom({ luminous_intensity: 400, distance: 2 })!.answerText).toBe("100");
  });
});

describe("法規（固定値検算）", () => {
  it("接地工事の種類: A種10Ω・C種10Ω・D種100Ω", () => {
    expect(groundingTypes.generateFrom({ case_index: 0 })!.answerText).toBe("10");
    expect(groundingTypes.generateFrom({ case_index: 1 })!.answerText).toBe("10");
    expect(groundingTypes.generateFrom({ case_index: 2 })!.answerText).toBe("100");
  });

  it("支線: 想定最大張力8kN×安全率2.5 → 20kN（木柱は1.5 → 12kN）", () => {
    expect(guyWireSafety.generateFrom({ max_tension: 8, safety_factor: 2.5 })!.answerText).toBe("20");
    expect(guyWireSafety.generateFrom({ max_tension: 8, safety_factor: 1.5 })!.answerText).toBe("12");
  });

  it("屋内対地電圧: 原則150V・2kW以上の専用回路で300V", () => {
    expect(indoorVoltageLimit.generateFrom({ case_index: 0 })!.answerText).toBe("150");
    expect(indoorVoltageLimit.generateFrom({ case_index: 1 })!.answerText).toBe("300");
  });

  it("供給電圧の維持: 100V系は95〜107V・200V系は182〜222V", () => {
    expect(supplyVoltageLimit.generateFrom({ case_index: 0 })!.answerText).toBe("107");
    expect(supplyVoltageLimit.generateFrom({ case_index: 1 })!.answerText).toBe("95");
    expect(supplyVoltageLimit.generateFrom({ case_index: 2 })!.answerText).toBe("222");
    expect(supplyVoltageLimit.generateFrom({ case_index: 3 })!.answerText).toBe("182");
  });

  it("高圧架空電線の高さは高圧に限定して出題する（68条の低圧4m例外との曖昧さ排除）", () => {
    const g = overheadClearance.generateFrom({ case_index: 3 })!;
    expect(g.defaultStatement).toContain("高圧架空電線");
    expect(g.answerText).toBe("5");
  });
});

describe("機械制御・電力管理（固定値検算）", () => {
  it("負帰還合成ゲイン: G=4, H=1 → 0.8 / G=20, H=0.2 → 4", () => {
    expect(blockDiagramGain.generateFrom({ forward_gain: 4, feedback_gain: 1 })!.answerText).toBe("0.8");
    expect(blockDiagramGain.generateFrom({ forward_gain: 20, feedback_gain: 0.2 })!.answerText).toBe("4");
  });

  it("損失係数: L=0.6 → F=0.3×0.6+0.7×0.36=43.2%", () => {
    expect(lossFactor.generateFrom({ load_factor: 0.6 })!.answerText).toBe("43.2");
  });

  it("合成最大需要: A=500kW×60%・B=300kW×50%, 不等率1.5 → 300kW", () => {
    // (300+150)/1.5 = 300
    expect(
      maxDemandComposite.generateFrom({
        capacity_a: 500,
        demand_factor_a: 0.6,
        capacity_b: 300,
        demand_factor_b: 0.5,
        diversity: 1.5,
      })!.answerText,
    ).toBe("300");
  });
});
