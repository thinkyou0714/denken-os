/**
 * テンプレート: RC 直列回路の時定数（理論・numeric）。
 *   時定数  τ = R·C
 *   R を〔kΩ〕、C を〔μF〕で与えると  τ〔ms〕 = R〔kΩ〕 × C〔μF〕
 *   （kΩ×μF = 10³ × 10⁻⁶ s = 10⁻³ s = 1ms）
 *
 * 典型ミス: 単位換算（kΩ・μF を SI に直さず ms を s と取り違える）。
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

const R_SET: ReadonlyArray<number> = [1, 2, 4, 5, 10, 20, 47, 100];
const C_SET: ReadonlyArray<number> = [1, 2, 4, 5, 10, 22, 47];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(R: number, C: number): GenerationResult | null {
  if (R <= 0 || C <= 0) return null;
  const tau = R * C; // ms
  if (!isCleanAnswer(tau)) return null;
  const answerText = formatClean(tau);

  return {
    format: "numeric",
    params: {
      resistance: { value: R, unit: "kohm", realistic_range: [1, 100] },
      capacitance: { value: C, unit: "uF", realistic_range: [1, 100] },
    },
    answerValue: tau,
    answerUnit: "ms",
    answerText,
    facts: { R, C, tau },
    defaultStatement: `抵抗 R=${R}kΩ とコンデンサ C=${C}μF を直列に接続した RC 回路の時定数 τ〔ms〕は?`,
    defaultSolution: [
      `時定数 τ=R·C`,
      `kΩ×μF=10³×10⁻⁶ s=10⁻³ s=1ms なので τ〔ms〕=R〔kΩ〕×C〔μF〕`,
      `τ=${R}×${C}=${answerText}ms`,
    ],
    physicallyValid: true,
  };
}

export const rcTimeConstant: Template = {
  topic: "RC回路の時定数",
  subject: "理論",
  exam: "denken3",
  difficulty: 1,
  paramSpecs: {
    resistance: { unit: "kohm", realistic_range: [1, 100] },
    capacitance: { unit: "uF", realistic_range: [1, 100] },
  },
  generate(rng) {
    return buildFrom(pick(R_SET, rng), pick(C_SET, rng));
  },
  generateFrom(params) {
    const { resistance, capacitance } = params;
    if (resistance === undefined || capacitance === undefined) return null;
    return buildFrom(resistance, capacitance);
  },
};
