/**
 * テンプレート: 誘電体を半分挿入した平行板コンデンサ（二種一次・理論・numeric）。
 *   極板間隔の半分の厚さに比誘電率 εr の誘電体を平行に挿入すると、
 *   空気層（厚さ d/2, 容量 2C0）と誘電体層（厚さ d/2, 容量 2εr·C0）の直列合成になり
 *     C = 2εr/(1+εr) × C0 〔μF〕
 *   過去問頻出の「平行板コンデンサ」を、部分挿入の直列合成にひねった改作。
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { defineTemplate, pick } from "./helpers.js";

const C0_SET: ReadonlyArray<number> = [2, 3, 4, 6];
const ER_SET: ReadonlyArray<number> = [2, 3, 4, 5];

type Params = {
  base_capacitance: number;
  relative_permittivity: number;
};

export const partialDielectricCapacitor = defineTemplate<Params>({
  topic: "誘電体を半分挿入したコンデンサ",
  subject: "理論",
  exam: "denken2_primary",
  difficulty: 4,
  pastExam: { area: "静電気", frequency: "high", years: [2007, 2012, 2017, 2023] },
  paramSpecs: {
    base_capacitance: { unit: "μF", realistic_range: [1, 10] },
    relative_permittivity: { unit: "", realistic_range: [2, 10] },
  },
  paramOrder: ["base_capacitance", "relative_permittivity"],
  draw(rng) {
    return {
      base_capacitance: pick(C0_SET, rng),
      relative_permittivity: pick(ER_SET, rng),
    };
  },
  buildFrom({ base_capacitance: c0, relative_permittivity: er }) {
    if (c0 <= 0 || er <= 1) return null; // εr>1（真空より大）でないと挿入の意味がない
    const airLayer = 2 * c0; // 厚さ d/2 の空気層
    const dielectricLayer = 2 * er * c0; // 厚さ d/2 の誘電体層
    const combined = (airLayer * dielectricLayer) / (airLayer + dielectricLayer);
    if (combined <= c0 || !isCleanAnswer(combined)) return null; // 挿入で必ず増加する
    const answerText = formatClean(combined);
    const air = formatClean(airLayer);
    const die = formatClean(dielectricLayer);
    return {
      format: "numeric",
      params: {
        base_capacitance: { value: c0, unit: "μF", realistic_range: [1, 10] },
        relative_permittivity: { value: er, unit: "", realistic_range: [2, 10] },
      },
      answerValue: combined,
      answerUnit: "μF",
      answerText,
      facts: { c0, er, airLayer, dielectricLayer, combined },
      defaultStatement:
        `極板間が空気の平行板コンデンサの静電容量は ${c0}μF である。極板間隔の半分の厚さをもつ` +
        `比誘電率 ${er} の誘電体板を、極板と平行に挿入した。挿入後の静電容量〔μF〕を求めよ。`,
      defaultSolution: [
        `着眼点: 電界方向に層が並ぶ挿入は「厚さ半分のコンデンサ2個の直列」とみなす。`,
        `空気層（厚さ d/2）: 2C0=${air}μF、誘電体層: 2εr·C0=${die}μF`,
        `直列合成: C=${air}×${die}/(${air}+${die})=${answerText}μF`,
        `ポイント: 極板に平行な挿入=直列、垂直な挿入=並列。εr 倍と早合点しないこと。`,
      ],
      physicallyValid: true,
    };
  },
});
