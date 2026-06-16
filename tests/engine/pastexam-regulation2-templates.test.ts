/**
 * pastexam-regulation2-templates.test.ts — 法規の最新化・充実化で新規追加した
 * 法規3テンプレ（変圧器容量の選定/特別高圧の絶縁耐力試験電圧/小規模事業用電気工作物・
 * index 登録済み。ここでは直接 import で検証）の閉形式検算とプロパティ検証。
 *
 * 各テンプレについて:
 *   - generateFrom(代表入力) の answerText / answerUnit / format が固定値どおり
 *   - numeric テンプレは generate(seededRng) を30回回し、返った非nullすべてで answerText が有限数
 */
import { describe, expect, it } from "vitest";
import { hvInsulationTestVoltage } from "../../lib/engine/templates/hv-insulation-test-voltage.js";
import { smallScaleElectricalFacility } from "../../lib/engine/templates/small-scale-electrical-facility.js";
import { transformerCapacitySelection } from "../../lib/engine/templates/transformer-capacity-selection.js";
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

describe("過去問傾向バックフィル2: 法規テンプレの閉形式検算", () => {
  it("変圧器容量 S=設備容量×需要率/力率（200kW,0.6,0.8 → 150 kVA）", () => {
    const g = transformerCapacitySelection.generateFrom({
      installed_capacity: 200,
      demand_factor: 0.6,
      power_factor: 0.8,
    });
    expect(g).not.toBeNull();
    expect(g?.answerText).toBe("150");
    expect(g?.answerUnit).toBe("kVA");
    expect(g?.format).toBe("numeric");
    expect(g?.choices).toBeUndefined();
  });

  it("変圧器容量（200kW,0.8,1.0 → 160 kVA）", () => {
    const g = transformerCapacitySelection.generateFrom({
      installed_capacity: 200,
      demand_factor: 0.8,
      power_factor: 1,
    });
    expect(g).not.toBeNull();
    expect(g?.answerText).toBe("160");
  });

  it("特別高圧の絶縁耐力試験電圧（22000V → 28750 V）", () => {
    const g = hvInsulationTestVoltage.generateFrom({ nominal_voltage: 22000 });
    expect(g).not.toBeNull();
    expect(g?.answerText).toBe("28750");
    expect(g?.answerUnit).toBe("V");
    expect(g?.format).toBe("numeric");
  });

  it("特別高圧の絶縁耐力試験電圧（33000V → 43125 V）", () => {
    const g = hvInsulationTestVoltage.generateFrom({ nominal_voltage: 33000 });
    expect(g).not.toBeNull();
    expect(g?.answerText).toBe("43125");
  });

  it("小規模事業用電気工作物（case_index:0 → 太陽光下限 10 kW）", () => {
    const g = smallScaleElectricalFacility.generateFrom({ case_index: 0 });
    expect(g).not.toBeNull();
    expect(g?.answerText).toBe("10");
    expect(g?.answerUnit).toBe("kW");
    expect(g?.format).toBe("multiple_choice");
    expect(g?.choices).toContain("10");
  });

  it("小規模事業用電気工作物（case_index:2 → 風力上限 20 kW）", () => {
    const g = smallScaleElectricalFacility.generateFrom({ case_index: 2 });
    expect(g).not.toBeNull();
    expect(g?.answerText).toBe("20");
  });
});

describe("過去問傾向バックフィル2: 法規テンプレの generate() 健全性（30回）", () => {
  it("transformerCapacitySelection: 返った非nullの answerText はすべて有限数", () => {
    expectCleanGeneration(transformerCapacitySelection, 1009);
  });
  it("hvInsulationTestVoltage: 返った非nullの answerText はすべて有限数", () => {
    expectCleanGeneration(hvInsulationTestVoltage, 1109);
  });
});
