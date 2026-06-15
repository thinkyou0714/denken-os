/**
 * テンプレート: 三相誘導電動機の回転速度。
 *   同期速度 Ns = 120·f / p 〔min⁻¹〕,  回転速度 N = Ns·(1 − s/100)
 * 正解はコードで算出。誤答は典型ミス（滑り忘れ・符号ミス・滑り二重適用）。
 */
import { defineTemplate, pick } from "./helpers.js";

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

    const vals = [N, Ns, wrongSign, doubleSlip];
    if (!vals.every((v) => Number.isInteger(v) && v > 0)) return null;
    const texts = new Set(vals.map((v) => String(v)));
    if (texts.size !== 4) return null;

    const answerText = String(N);
    const choices = [...texts].sort((a, b) => Number(a) - Number(b));

    return {
      params: {
        frequency: { value: f, unit: "Hz", realistic_range: [50, 60] },
        poles: { value: p, unit: "pole", realistic_range: [2, 12] },
        slip: { value: s, unit: "%", realistic_range: [1, 10] },
      },
      answerValue: N,
      answerUnit: "min⁻¹",
      answerText,
      choices,
      distractors: [
        { text: String(Ns), reason: "滑りを忘れ同期速度のまま" },
        { text: String(wrongSign), reason: "滑りを足してしまう符号ミス" },
        { text: String(doubleSlip), reason: "滑りを二重に適用" },
      ],
      likelyWrongChoice: String(Ns),
      facts: { f, p, s, Ns, N },
      defaultStatement: `周波数${f}Hz、極数${p}の三相誘導電動機が滑り${s}%で運転している。回転速度N〔min⁻¹〕は?`,
      defaultSolution: [
        `同期速度 Ns=120·f/p=120·${f}/${p}=${Ns} min⁻¹`,
        `滑り s=${s}% より N=Ns·(1−s/100)`,
        `N=${Ns}·(1−${s}/100)=${answerText} min⁻¹`,
      ],
      physicallyValid: s < 100 && N > 0,
    };
  },
});
