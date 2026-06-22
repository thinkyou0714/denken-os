/**
 * テンプレート: 三相誘導電動機の回転速度。
 *   同期速度 Ns = 120·f / p 〔min⁻¹〕,  回転速度 N = Ns·(1 − s/100)
 * 正解はコードで算出。誤答は典型ミス（滑り忘れ・符号ミス・滑り二重適用・すべり速度との取り違え）。
 * 本番（一次）は五択マークシートのため buildMcChoices で五択に整える。
 */
import { formatClean } from "../clean.js";
import { buildMcChoices, defineTemplate, pick } from "./helpers.js";

const FREQ = [50, 60];
const POLES = [2, 4, 6, 8, 10, 12];
const SLIP = [2, 3, 4, 5];

type Params = {
  frequency: number;
  poles: number;
  slip: number;
};

export const inductionMotorSpeed = defineTemplate<Params>({
  topic: "誘導電動機の回転速度",
  subject: "機械",
  exam: "denken3",
  difficulty: 2,
  pastExam: { area: "誘導機", frequency: "high", years: [2007, 2011, 2015, 2019, 2023] },
  paramSpecs: {
    frequency: { unit: "Hz", realistic_range: [50, 60] },
    poles: { unit: "pole", realistic_range: [2, 12] },
    slip: { unit: "%", realistic_range: [1, 10] },
  },
  paramOrder: ["frequency", "poles", "slip"],
  draw(rng) {
    return {
      frequency: pick(FREQ, rng),
      poles: pick(POLES, rng),
      slip: pick(SLIP, rng),
    };
  },
  buildFrom({ frequency: f, poles: p, slip: s }) {
    if (f <= 0 || p <= 0 || s <= 0) return null;
    const Ns = (120 * f) / p;
    if (!Number.isInteger(Ns)) return null;
    const slipSpeed = (Ns * s) / 100;
    const N = Ns - slipSpeed; // 正解
    const wrongSign = Ns + slipSpeed; // 符号ミス（滑りを足す）
    const doubleSlip = Ns - 2 * slipSpeed; // 滑り二重適用

    // 整数性・正値は buildMcChoices の clean ゲートでも弾けるが、min⁻¹ は整数前提のため先に確認。
    const vals = [N, Ns, wrongSign, doubleSlip, slipSpeed];
    if (!vals.every((v) => Number.isInteger(v) && v > 0)) return null;

    const mc = buildMcChoices(
      N,
      [
        { value: Ns, reason: "滑りを忘れ同期速度のまま" },
        { value: wrongSign, reason: "滑りを足してしまう符号ミス" },
        { value: doubleSlip, reason: "滑りを二重に適用" },
        { value: slipSpeed, reason: "回転速度ではなく すべり速度 Ns·s/100 を答えた" },
      ],
      formatClean,
    );
    if (!mc) return null;

    return {
      params: {
        frequency: { value: f, unit: "Hz", realistic_range: [50, 60] },
        poles: { value: p, unit: "pole", realistic_range: [2, 12] },
        slip: { value: s, unit: "%", realistic_range: [1, 10] },
      },
      answerValue: N,
      answerUnit: "min⁻¹",
      answerText: mc.answerText,
      choices: mc.choices,
      distractors: mc.distractors,
      likelyWrongChoice: formatClean(Ns),
      facts: { f, p, s, Ns, N },
      defaultStatement: `周波数${f}Hz、極数${p}の三相誘導電動機が滑り${s}%で運転している。回転速度N〔min⁻¹〕は?`,
      defaultSolution: [
        `同期速度 Ns=120·f/p=120·${f}/${p}=${Ns} min⁻¹`,
        `滑り s=${s}% より N=Ns·(1−s/100)`,
        `N=${Ns}·(1−${s}/100)=${mc.answerText} min⁻¹`,
      ],
      physicallyValid: s < 100 && N > 0,
    };
  },
});
