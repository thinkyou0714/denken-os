/**
 * pastexam-theory-templates.test.ts — 過去問傾向拡充で新規追加した
 * 理論6テンプレ（index 登録済み・ここでは直接 import で検証）の閉形式検算とプロパティ検証。
 * 相互インダクタンスは和動/差動の2ケースを検算するため、代表値検算は計7ケース。
 *
 * 各テンプレについて:
 *   - generateFrom(代表入力) の answerText / answerUnit が固定値どおり
 *   - format==="numeric"、choices===undefined（選択肢なし）
 *   - generate(seededRng) を30回回し、返った非nullすべてで answerText が有限数
 */
import { describe, expect, it } from "vitest";
import { deltaWyeResistance } from "../../lib/engine/templates/delta-wye-resistance.js";
import { mutualInductance } from "../../lib/engine/templates/mutual-inductance.js";
import { parallelConductorForce } from "../../lib/engine/templates/parallel-conductor-force.js";
import { pointChargePotential } from "../../lib/engine/templates/point-charge-potential.js";
import { solenoidMagneticField } from "../../lib/engine/templates/solenoid-magnetic-field.js";
import { theveninLoadCurrent } from "../../lib/engine/templates/thevenin-load-current.js";
import type { Template } from "../../lib/engine/templates/types.js";
import { seededRng } from "../helpers/rng.js";

/** generate() を回数分回し、返った非nullの answerText がすべて有限数であることを検証する。 */
function expectCleanGeneration(t: Template, seed: number, runs = 30): void {
  const rng = seededRng(seed);
  for (let i = 0; i < runs; i++) {
    const g = t.generate(rng);
    if (!g) continue;
    const n = Number(g.answerText);
    expect(Number.isFinite(n), `answerText=${g.answerText} は有限数であるべき`).toBe(true);
  }
}

describe("過去問傾向バックフィル: 理論テンプレ（numeric）の閉形式検算", () => {
  it("ソレノイド内の磁界 H=NI/l（500,2,0.5 → 2000 A/m）", () => {
    const g = solenoidMagneticField.generateFrom({ turns: 500, current: 2, length: 0.5 });
    expect(g).not.toBeNull();
    expect(g?.answerText).toBe("2000");
    expect(g?.answerUnit).toBe("A/m");
    expect(g?.format).toBe("numeric");
    expect(g?.choices).toBeUndefined();
  });

  it("平行導体間の電磁力 F=2e-7·I1·I2/d（100,100,0.1 → 0.02 N/m）", () => {
    const g = parallelConductorForce.generateFrom({ current1: 100, current2: 100, distance: 0.1 });
    expect(g).not.toBeNull();
    expect(g?.answerText).toBe("0.02");
    expect(g?.answerUnit).toBe("N/m");
    expect(g?.format).toBe("numeric");
    expect(g?.choices).toBeUndefined();
  });

  it("相互インダクタンス 和動 L1+L2+2M（20,30,M10,和動 → 70 mH）", () => {
    const g = mutualInductance.generateFrom({ inductance1: 20, inductance2: 30, mutual: 10, connection: 0 });
    expect(g).not.toBeNull();
    expect(g?.answerText).toBe("70");
    expect(g?.answerUnit).toBe("mH");
    expect(g?.format).toBe("numeric");
    expect(g?.choices).toBeUndefined();
  });

  it("相互インダクタンス 差動 L1+L2-2M（20,30,M10,差動 → 30 mH）", () => {
    const g = mutualInductance.generateFrom({ inductance1: 20, inductance2: 30, mutual: 10, connection: 1 });
    expect(g).not.toBeNull();
    expect(g?.answerText).toBe("30");
    expect(g?.answerUnit).toBe("mH");
    expect(g?.format).toBe("numeric");
    expect(g?.choices).toBeUndefined();
  });

  it("Δ-Y変換 R_Y=R_Δ/3（9 → 3 Ω）", () => {
    const g = deltaWyeResistance.generateFrom({ delta_resistance: 9 });
    expect(g).not.toBeNull();
    expect(g?.answerText).toBe("3");
    expect(g?.answerUnit).toBe("ohm");
    expect(g?.format).toBe("numeric");
    expect(g?.choices).toBeUndefined();
  });

  it("点電荷の電位 V=9·Q/r（2nC,0.6 → 30 V）", () => {
    const g = pointChargePotential.generateFrom({ charge: 2, distance: 0.6 });
    expect(g).not.toBeNull();
    expect(g?.answerText).toBe("30");
    expect(g?.answerUnit).toBe("V");
    expect(g?.format).toBe("numeric");
    expect(g?.choices).toBeUndefined();
  });

  it("テブナンの定理 I=E0/(R0+RL)（100,5,20 → 4 A）", () => {
    const g = theveninLoadCurrent.generateFrom({ emf: 100, thevenin_resistance: 5, load_resistance: 20 });
    expect(g).not.toBeNull();
    expect(g?.answerText).toBe("4");
    expect(g?.answerUnit).toBe("A");
    expect(g?.format).toBe("numeric");
    expect(g?.choices).toBeUndefined();
  });
});

describe("過去問傾向バックフィル: 理論テンプレの generate() 健全性（30回）", () => {
  it("solenoidMagneticField: 返った非nullの answerText はすべて有限数", () => {
    expectCleanGeneration(solenoidMagneticField, 101);
  });
  it("parallelConductorForce: 返った非nullの answerText はすべて有限数", () => {
    expectCleanGeneration(parallelConductorForce, 202);
  });
  it("mutualInductance: 返った非nullの answerText はすべて有限数", () => {
    expectCleanGeneration(mutualInductance, 303);
  });
  it("deltaWyeResistance: 返った非nullの answerText はすべて有限数", () => {
    expectCleanGeneration(deltaWyeResistance, 404);
  });
  it("pointChargePotential: 返った非nullの answerText はすべて有限数", () => {
    expectCleanGeneration(pointChargePotential, 505);
  });
  it("theveninLoadCurrent: 返った非nullの answerText はすべて有限数", () => {
    expectCleanGeneration(theveninLoadCurrent, 606);
  });
});
