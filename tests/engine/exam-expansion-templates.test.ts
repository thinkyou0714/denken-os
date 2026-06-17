/**
 * exam-expansion-templates.test.ts — 二種試験範囲の拡充で新規追加した6テンプレの
 * 閉形式検算（手検算 → 固定）とプロパティ検証。
 *
 * 各テンプレについて代表入力の answerText/answerUnit/format を固定し、
 * generate(seededRng) を多数回回して「綺麗・物理成立・選択肢一意(MC)・解説整合」を確認する。
 */
import { describe, expect, it } from "vitest";
import { isCleanAnswer } from "../../lib/engine/clean.js";
import { groundFaultNeutralResistance } from "../../lib/engine/templates/ground-fault-neutral-resistance.js";
import { kirchhoffTwoMesh } from "../../lib/engine/templates/kirchhoff-two-mesh.js";
import { parallelImpedanceMagnitude } from "../../lib/engine/templates/parallel-impedance-magnitude.js";
import { pwmInverterVoltage } from "../../lib/engine/templates/pwm-inverter-voltage.js";
import { twoWattmeterPower } from "../../lib/engine/templates/two-wattmeter-power.js";
import type { Template } from "../../lib/engine/templates/types.js";
import { vConnectionTransformer } from "../../lib/engine/templates/v-connection-transformer.js";
import { narrationMatchesAnswer } from "../../lib/engine/validate.js";
import { seededRng } from "../helpers/rng.js";

/**
 * generate() を回数分回し、返った非nullすべてで
 * 綺麗・物理成立・解説整合・(MC なら)選択肢一意 を確認する。
 */
function expectHealthyGeneration(t: Template, seed: number, runs = 80): number {
  const rng = seededRng(seed);
  let drawn = 0;
  for (let i = 0; i < runs; i++) {
    const g = t.generate(rng);
    if (!g) continue;
    drawn += 1;
    expect(g.physicallyValid, `${t.topic}: physicallyValid`).toBe(true);
    const n = Number(g.answerText);
    if (Number.isFinite(n)) expect(isCleanAnswer(n), `${t.topic}: answer=${g.answerText} は綺麗`).toBe(true);
    expect(narrationMatchesAnswer(g.defaultSolution, g.answerText), `${t.topic}: 解説整合`).toBe(true);
    const format = g.format ?? "multiple_choice";
    if (format === "multiple_choice") {
      expect(g.choices, `${t.topic}: MC は choices を持つ`).toBeDefined();
      expect(new Set(g.choices).size, `${t.topic}: 選択肢一意`).toBe(g.choices!.length);
      expect(g.choices, `${t.topic}: 正解が選択肢に含まれる`).toContain(g.answerText);
    } else {
      expect(g.choices, `${t.topic}: numeric/descriptive は選択肢なし`).toBeUndefined();
    }
  }
  return drawn;
}

describe("二種拡充テンプレ: 閉形式（固定値検算）", () => {
  it("二電力計法 P=W1+W2（2000,1000 → 3000W, numeric）", () => {
    const g = twoWattmeterPower.generateFrom({ wattmeter1: 2000, wattmeter2: 1000 });
    expect(g).not.toBeNull();
    expect(g!.answerText).toBe("3000");
    expect(g!.answerUnit).toBe("W");
    expect(g!.format).toBe("numeric");
    expect(g!.choices).toBeUndefined();
  });

  it("二電力計法 力率 tanφ=√3(W1−W2)/(W1+W2) が facts に整合（W1=2000,W2=1000）", () => {
    const g = twoWattmeterPower.generateFrom({ wattmeter1: 2000, wattmeter2: 1000 })!;
    // tanφ=√3·1000/3000=√3/3≈0.5774 → cosφ≈0.866
    expect(g.facts.tanPhi).toBeCloseTo(0.5774, 3);
    expect(g.facts.cosPhi).toBeCloseTo(0.866, 3);
  });

  it("V結線 利用率（case0 → 0.87, MC）", () => {
    const g = vConnectionTransformer.generateFrom({ case_index: 0 });
    expect(g).not.toBeNull();
    expect(g!.answerText).toBe("0.87");
    expect(g!.format).toBe("multiple_choice");
    expect(g!.choices).toContain("0.87");
    expect(new Set(g!.choices).size).toBe(g!.choices!.length);
  });

  it("V結線 出力比（case1 → 0.58, MC）", () => {
    const g = vConnectionTransformer.generateFrom({ case_index: 1 });
    expect(g).not.toBeNull();
    expect(g!.answerText).toBe("0.58");
    expect(g!.format).toBe("multiple_choice");
  });

  it("キルヒホッフ2メッシュ（E1=14,E2=10,R1=2,R2=2,R3=1 → I3=6A, numeric）", () => {
    const g = kirchhoffTwoMesh.generateFrom({ emf1: 14, emf2: 10, R1: 2, R2: 2, R3: 1 });
    expect(g).not.toBeNull();
    expect(g!.answerText).toBe("6");
    expect(g!.answerUnit).toBe("A");
    expect(g!.format).toBe("numeric");
    // 検算: I1=4, I2=2, I1+I2=6=I3
    expect(g!.facts.I1).toBe(4);
    expect(g!.facts.I2).toBe(2);
    expect(g!.facts.V).toBe(6);
  });

  it("複素インピーダンス並列 |Z|=R·X/√(R²+X²)（R=3,X=4 → 2.4Ω, numeric）", () => {
    const g = parallelImpedanceMagnitude.generateFrom({ resistance: 3, reactance: 4 });
    expect(g).not.toBeNull();
    expect(g!.answerText).toBe("2.4");
    expect(g!.answerUnit).toBe("Ω");
    expect(g!.format).toBe("numeric");
    expect(g!.choices).toBeUndefined();
  });

  it("複素インピーダンス並列 |Z|=R·X/√(R²+X²)（R=6,X=8 → 4.8Ω）", () => {
    expect(parallelImpedanceMagnitude.generateFrom({ resistance: 6, reactance: 8 })!.answerText).toBe("4.8");
  });

  it("PWMインバータ V/f一定 V2=V1·f2/f1（200V,50Hz→30Hz → 120V, numeric）", () => {
    const g = pwmInverterVoltage.generateFrom({ base_voltage: 200, base_frequency: 50, output_frequency: 30 });
    expect(g).not.toBeNull();
    expect(g!.answerText).toBe("120");
    expect(g!.answerUnit).toBe("V");
    expect(g!.format).toBe("numeric");
    expect(g!.choices).toBeUndefined();
  });

  it("PWMインバータ V/f一定 V2=V1·f2/f1（400V,60Hz→45Hz → 300V）", () => {
    expect(
      pwmInverterVoltage.generateFrom({ base_voltage: 400, base_frequency: 60, output_frequency: 45 })!.answerText,
    ).toBe("300");
  });

  it("中性点抵抗接地 一線地絡 |Ig|=3E/√((3Rn)²+(2X1+X0)²)（Rn10,X1=5,X0=30,E1000 → 60A, descriptive）", () => {
    const g = groundFaultNeutralResistance.generateFrom({
      neutral_resistance: 10,
      positive_reactance: 5,
      zero_reactance: 30,
      phase_voltage: 1000,
    });
    expect(g).not.toBeNull();
    expect(g!.answerText).toBe("60");
    expect(g!.answerUnit).toBe("A");
    expect(g!.format).toBe("descriptive");
    expect(g!.choices).toBeUndefined();
    // |Z|=√(30²+40²)=50
    expect(g!.facts.Zmag).toBe(50);
    // 多段導出（6ステップ以上）であること（rubric を厚くするため）。
    expect(g!.defaultSolution.length).toBeGreaterThanOrEqual(6);
  });

  it("中性点抵抗接地 一線地絡 別ケース（Rn20,X1=10,X0=60,E2000 → 60A）", () => {
    expect(
      groundFaultNeutralResistance.generateFrom({
        neutral_resistance: 20,
        positive_reactance: 10,
        zero_reactance: 60,
        phase_voltage: 2000,
      })!.answerText,
    ).toBe("60");
  });
});

describe("二種拡充テンプレ: 難易度メタ", () => {
  it("中性点抵抗接地の一線地絡は難易度5・二次・descriptive", () => {
    expect(groundFaultNeutralResistance.difficulty).toBe(5);
    expect(groundFaultNeutralResistance.exam).toBe("denken2_secondary");
  });
});

describe("二種拡充テンプレ: generate() 健全性（多数seed）", () => {
  it("twoWattmeterPower", () => {
    expect(expectHealthyGeneration(twoWattmeterPower, 1201)).toBeGreaterThanOrEqual(10);
  });
  it("vConnectionTransformer", () => {
    expect(expectHealthyGeneration(vConnectionTransformer, 1202)).toBeGreaterThanOrEqual(2);
  });
  it("kirchhoffTwoMesh", () => {
    expect(expectHealthyGeneration(kirchhoffTwoMesh, 1203)).toBeGreaterThanOrEqual(10);
  });
  it("parallelImpedanceMagnitude", () => {
    expect(expectHealthyGeneration(parallelImpedanceMagnitude, 1204)).toBeGreaterThanOrEqual(10);
  });
  it("pwmInverterVoltage", () => {
    expect(expectHealthyGeneration(pwmInverterVoltage, 1205)).toBeGreaterThanOrEqual(10);
  });
  it("groundFaultNeutralResistance", () => {
    expect(expectHealthyGeneration(groundFaultNeutralResistance, 1206)).toBeGreaterThanOrEqual(5);
  });
});
