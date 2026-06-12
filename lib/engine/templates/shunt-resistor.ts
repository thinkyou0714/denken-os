/**
 * テンプレート: 分流器（理論・numeric）。
 *   倍率 m の分流器抵抗  R_s = r / (m − 1)   〔Ω〕（r=電流計の内部抵抗）
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { pick } from "./helpers.js";
import type { GenerationResult, Template } from "./types.js";

const R_SET: ReadonlyArray<number> = [9, 18, 20, 45, 90, 99];
const M_SET: ReadonlyArray<number> = [2, 4, 5, 10, 11, 20, 100];

function buildFrom(r: number, m: number): GenerationResult | null {
  if (r <= 0 || m <= 1) return null;
  const Rs = r / (m - 1);
  if (!isCleanAnswer(Rs)) return null;
  const answerText = formatClean(Rs);
  return {
    format: "numeric",
    params: {
      internal_resistance: { value: r, unit: "ohm", realistic_range: [1, 100] },
      multiplier: { value: m, unit: "", realistic_range: [2, 100] },
    },
    answerValue: Rs,
    answerUnit: "ohm",
    answerText,
    facts: { r, m, Rs },
    defaultStatement: `内部抵抗 r=${r}Ω の電流計の測定範囲を ${m} 倍にしたい。並列に接続する分流器の抵抗 R_s〔Ω〕は?`,
    defaultSolution: [
      `分流器: 計器電流の (m−1) 倍を分流させる → R_s=r/(m−1)`,
      `R_s=${r}/(${m}−1)`,
      `R_s=${answerText}Ω`,
    ],
    physicallyValid: true,
  };
}

export const shuntResistor: Template = {
  topic: "分流器",
  subject: "理論",
  exam: "denken3",
  difficulty: 2,
  paramSpecs: {
    internal_resistance: { unit: "ohm", realistic_range: [1, 100] },
    multiplier: { unit: "", realistic_range: [2, 100] },
  },
  generate(rng) {
    return buildFrom(pick(R_SET, rng), pick(M_SET, rng));
  },
  generateFrom(params) {
    const { internal_resistance, multiplier } = params;
    if (internal_resistance === undefined || multiplier === undefined) return null;
    return buildFrom(internal_resistance, multiplier);
  },
};
