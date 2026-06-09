/**
 * テンプレート: 倍率器（理論・numeric）。
 *   倍率 m の倍率器抵抗  R_m = r·(m − 1)   〔Ω〕（r=電圧計の内部抵抗）
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

const R_SET: ReadonlyArray<number> = [10, 20, 50, 100, 1000, 2000];
const M_SET: ReadonlyArray<number> = [2, 3, 5, 10, 20, 50, 100];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(r: number, m: number): GenerationResult | null {
  if (r <= 0 || m <= 1) return null;
  const Rm = r * (m - 1);
  if (!isCleanAnswer(Rm)) return null;
  const answerText = formatClean(Rm);
  return {
    format: "numeric",
    params: {
      internal_resistance: { value: r, unit: "ohm", realistic_range: [10, 2000] },
      multiplier: { value: m, unit: "", realistic_range: [2, 100] },
    },
    answerValue: Rm,
    answerUnit: "ohm",
    answerText,
    facts: { r, m, Rm },
    defaultStatement: `内部抵抗 r=${r}Ω の電圧計の測定範囲を ${m} 倍にしたい。直列に接続する倍率器の抵抗 R_m〔Ω〕は?`,
    defaultSolution: [`倍率器: 計器電圧の (m−1) 倍を分担 → R_m=r·(m−1)`, `R_m=${r}×(${m}−1)`, `R_m=${answerText}Ω`],
    physicallyValid: true,
  };
}

export const multiplierResistor: Template = {
  topic: "倍率器",
  subject: "理論",
  exam: "denken3",
  difficulty: 2,
  paramSpecs: {
    internal_resistance: { unit: "ohm", realistic_range: [10, 2000] },
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
