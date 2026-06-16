/**
 * pastexam-tertiary-templates.test.ts — 過去問傾向の未カバー分野を埋める
 * 新規2テンプレ（原子力発電の電気出力・トランジスタの電流増幅率）の閉形式検算と
 * プロパティ検証。index 未登録のため直接 import で検証する。
 *
 * 各テンプレについて:
 *   - generateFrom(代表入力) の answerText / answerUnit が固定値どおり
 *   - format==="numeric"、choices===undefined（選択肢なし）
 *   - generate(seededRng) を30回回し、返った非nullすべてで answerText が有限数
 */
import { describe, expect, it } from "vitest";
import { nuclearPowerOutput } from "../../lib/engine/templates/nuclear-power-output.js";
import { transistorCurrentGain } from "../../lib/engine/templates/transistor-current-gain.js";
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

describe("過去問傾向バックフィル: 新規テンプレ（numeric）の閉形式検算", () => {
  it("原子力発電の電気出力 Pe=η·Qt（0.34,3000 → 1020 MW）", () => {
    const g = nuclearPowerOutput.generateFrom({ thermal_output: 3000, efficiency: 0.34 });
    expect(g).not.toBeNull();
    expect(g?.answerText).toBe("1020");
    expect(g?.answerUnit).toBe("MW");
    expect(g?.format).toBe("numeric");
    expect(g?.choices).toBeUndefined();
  });

  it("原子力発電の電気出力 Pe=η·Qt（0.33,2000 → 660 MW）", () => {
    const g = nuclearPowerOutput.generateFrom({ thermal_output: 2000, efficiency: 0.33 });
    expect(g).not.toBeNull();
    expect(g?.answerText).toBe("660");
  });

  it("トランジスタの電流増幅率 hFE=Ic/Ib（2mA,20μA → 100 倍）", () => {
    const g = transistorCurrentGain.generateFrom({ collector_current: 2, base_current: 20 });
    expect(g).not.toBeNull();
    expect(g?.answerText).toBe("100");
    expect(g?.answerUnit).toBe("倍");
    expect(g?.format).toBe("numeric");
    expect(g?.choices).toBeUndefined();
  });

  it("トランジスタの電流増幅率 hFE=Ic/Ib（3mA,25μA → 120 倍）", () => {
    const g = transistorCurrentGain.generateFrom({ collector_current: 3, base_current: 25 });
    expect(g).not.toBeNull();
    expect(g?.answerText).toBe("120");
  });
});

describe("過去問傾向バックフィル: 新規テンプレの generate() 健全性（30回）", () => {
  it("nuclearPowerOutput: 返った非nullの answerText はすべて有限数", () => {
    expectCleanGeneration(nuclearPowerOutput, 707);
  });
  it("transistorCurrentGain: 返った非nullの answerText はすべて有限数", () => {
    expectCleanGeneration(transistorCurrentGain, 808);
  });
});
