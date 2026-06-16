/**
 * pastexam-secondary-templates.test.ts — 過去問傾向拡充で新規追加した
 * 二次科目寄り3テンプレ（同期速度・揚水総合効率・誘導機二次銅損）の閉形式検算と
 * プロパティ検証。index 未登録のため直接 import で検証する。
 *
 * 各テンプレについて:
 *   - generateFrom(代表入力) の answerText / answerUnit が固定値どおり
 *   - format==="numeric"、choices===undefined（選択肢なし）
 *   - generate(seededRng) を30回回し、返った非nullすべてで answerText が有限数
 */
import { describe, expect, it } from "vitest";
import { inductionSecondaryCopperLoss } from "../../lib/engine/templates/induction-secondary-copper-loss.js";
import { pumpedStorageEfficiency } from "../../lib/engine/templates/pumped-storage-efficiency.js";
import { synchronousSpeed } from "../../lib/engine/templates/synchronous-speed.js";
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

describe("過去問傾向バックフィル: 二次寄りテンプレ（numeric）の閉形式検算", () => {
  it("同期速度 Ns=120·f/p（60Hz,4極 → 1800 min⁻¹）", () => {
    const g = synchronousSpeed.generateFrom({ frequency: 60, poles: 4 });
    expect(g).not.toBeNull();
    expect(g?.answerText).toBe("1800");
    expect(g?.answerUnit).toBe("min⁻¹");
    expect(g?.format).toBe("numeric");
    expect(g?.choices).toBeUndefined();
  });

  it("同期速度 Ns=120·f/p（50Hz,6極 → 1000 min⁻¹）", () => {
    const g = synchronousSpeed.generateFrom({ frequency: 50, poles: 6 });
    expect(g).not.toBeNull();
    expect(g?.answerText).toBe("1000");
    expect(g?.answerUnit).toBe("min⁻¹");
    expect(g?.format).toBe("numeric");
    expect(g?.choices).toBeUndefined();
  });

  it("揚水総合効率 η=Wg/Wp×100（1000,700 → 70 %）", () => {
    const g = pumpedStorageEfficiency.generateFrom({ pumping_energy: 1000, generating_energy: 700 });
    expect(g).not.toBeNull();
    expect(g?.answerText).toBe("70");
    expect(g?.answerUnit).toBe("%");
    expect(g?.format).toBe("numeric");
    expect(g?.choices).toBeUndefined();
  });

  it("揚水総合効率 η=Wg/Wp×100（1200,900 → 75 %）", () => {
    const g = pumpedStorageEfficiency.generateFrom({ pumping_energy: 1200, generating_energy: 900 });
    expect(g).not.toBeNull();
    expect(g?.answerText).toBe("75");
    expect(g?.answerUnit).toBe("%");
    expect(g?.format).toBe("numeric");
    expect(g?.choices).toBeUndefined();
  });

  it("二次銅損 Pc2=s·P2（10kW,0.05 → 0.5 kW）", () => {
    const g = inductionSecondaryCopperLoss.generateFrom({ secondary_input: 10, slip: 0.05 });
    expect(g).not.toBeNull();
    expect(g?.answerText).toBe("0.5");
    expect(g?.answerUnit).toBe("kW");
    expect(g?.format).toBe("numeric");
    expect(g?.choices).toBeUndefined();
  });

  it("二次銅損 Pc2=s·P2（20kW,0.06 → 1.2 kW）", () => {
    const g = inductionSecondaryCopperLoss.generateFrom({ secondary_input: 20, slip: 0.06 });
    expect(g).not.toBeNull();
    expect(g?.answerText).toBe("1.2");
    expect(g?.answerUnit).toBe("kW");
    expect(g?.format).toBe("numeric");
    expect(g?.choices).toBeUndefined();
  });
});

describe("過去問傾向バックフィル: 二次寄りテンプレの generate() 健全性（30回）", () => {
  it("synchronousSpeed: 返った非nullの answerText はすべて有限数", () => {
    expectCleanGeneration(synchronousSpeed, 711);
  });
  it("pumpedStorageEfficiency: 返った非nullの answerText はすべて有限数", () => {
    expectCleanGeneration(pumpedStorageEfficiency, 822);
  });
  it("inductionSecondaryCopperLoss: 返った非nullの answerText はすべて有限数", () => {
    expectCleanGeneration(inductionSecondaryCopperLoss, 933);
  });
});
