/**
 * テンプレート: 電線の許容引張荷重（法規・numeric）。
 *   許容張力  T_a = T_b / f   〔N〕（T_b=引張強さ, f=安全率）
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

const TB_SET: ReadonlyArray<number> = [2000, 4000, 8000, 9800, 10000, 20000];
const F_SET: ReadonlyArray<number> = [2, 2.5, 4, 5];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(Tb: number, f: number): GenerationResult | null {
  if (Tb <= 0 || f <= 0) return null;
  const Ta = Tb / f;
  if (!isCleanAnswer(Ta)) return null;
  const answerText = formatClean(Ta);
  return {
    format: "numeric",
    params: {
      tensile_strength: { value: Tb, unit: "N", realistic_range: [2000, 20000] },
      safety_factor: { value: f, unit: "", realistic_range: [2, 5] },
    },
    answerValue: Ta,
    answerUnit: "N",
    answerText,
    facts: { Tb, f, Ta },
    defaultStatement: `引張強さ T_b=${Tb}N の電線を安全率 f=${f} で使用する。許容引張荷重 T_a〔N〕は?`,
    defaultSolution: [`許容張力 T_a=引張強さ/安全率=T_b/f`, `T_a=${Tb}/${f}`, `T_a=${answerText}N`],
    physicallyValid: true,
  };
}

export const allowableTension: Template = {
  topic: "電線の許容張力",
  subject: "法規",
  exam: "denken2_primary",
  difficulty: 2,
  paramSpecs: {
    tensile_strength: { unit: "N", realistic_range: [2000, 20000] },
    safety_factor: { unit: "", realistic_range: [2, 5] },
  },
  generate(rng) {
    return buildFrom(pick(TB_SET, rng), pick(F_SET, rng));
  },
  generateFrom(params) {
    const { tensile_strength, safety_factor } = params;
    if (tensile_strength === undefined || safety_factor === undefined) return null;
    return buildFrom(tensile_strength, safety_factor);
  },
};
