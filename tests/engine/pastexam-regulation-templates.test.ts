/**
 * pastexam-regulation-templates.test.ts — 過去問傾向バックフィルで新規追加した
 * 法規3テンプレ（漏えい電流/電線の実長/支持物の根入れ深さ・index 未登録・直接 import）の
 * 閉形式検算とプロパティ検証。
 *
 * 各テンプレについて:
 *   - generateFrom(代表入力) の answerText / answerUnit が固定値どおり
 *   - format==="numeric"、choices===undefined（選択肢なし）
 *   - generate(seededRng) を30回回し、返った非nullすべてで answerText が有限数
 */
import { describe, expect, it } from "vitest";
import { conductorActualLength } from "../../lib/engine/templates/conductor-actual-length.js";
import { leakageCurrent } from "../../lib/engine/templates/leakage-current.js";
import { poleEmbedmentDepth } from "../../lib/engine/templates/pole-embedment-depth.js";
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

describe("過去問傾向バックフィル: 法規テンプレ（numeric）の閉形式検算", () => {
  it("漏えい電流 I=V/(R×10³)〔mA〕（200V,0.2MΩ → 1 mA）", () => {
    const g = leakageCurrent.generateFrom({ voltage: 200, insulation_resistance: 0.2 });
    expect(g).not.toBeNull();
    expect(g?.answerText).toBe("1");
    expect(g?.answerUnit).toBe("mA");
    expect(g?.format).toBe("numeric");
    expect(g?.choices).toBeUndefined();
  });

  it("電線の実長 L=S+8D²/(3S)（200m,3m → 200.12 m）", () => {
    const g = conductorActualLength.generateFrom({ span: 200, dip: 3 });
    expect(g).not.toBeNull();
    expect(g?.answerText).toBe("200.12");
    expect(g?.answerUnit).toBe("m");
    expect(g?.format).toBe("numeric");
    expect(g?.choices).toBeUndefined();
  });

  it("支持物の根入れ深さ depth=L/6（12m → 2 m）", () => {
    const g = poleEmbedmentDepth.generateFrom({ pole_length: 12 });
    expect(g).not.toBeNull();
    expect(g?.answerText).toBe("2");
    expect(g?.answerUnit).toBe("m");
    expect(g?.format).toBe("numeric");
    expect(g?.choices).toBeUndefined();
  });
});

describe("過去問傾向バックフィル: 法規テンプレの generate() 健全性（30回）", () => {
  it("leakageCurrent: 返った非nullの answerText はすべて有限数", () => {
    expectCleanGeneration(leakageCurrent, 707);
  });
  it("conductorActualLength: 返った非nullの answerText はすべて有限数", () => {
    expectCleanGeneration(conductorActualLength, 808);
  });
  it("poleEmbedmentDepth: 返った非nullの answerText はすべて有限数", () => {
    expectCleanGeneration(poleEmbedmentDepth, 909);
  });
});
