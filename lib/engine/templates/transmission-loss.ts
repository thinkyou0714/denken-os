/**
 * テンプレート: 三相送電線の電力損失（電力・numeric）。
 *   三相3線式の線路損失  P_loss = 3·I²·R  〔W〕
 *   （各相 I²R の3線合計。1線あたり抵抗 R）
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

const I_SET: ReadonlyArray<number> = [10, 20, 30, 40, 50, 80, 100];
const R_SET: ReadonlyArray<number> = [0.5, 1, 2, 2.5, 5];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(I: number, R: number): GenerationResult | null {
  if (I <= 0 || R <= 0) return null;
  const lossW = 3 * I * I * R;
  const lossKW = lossW / 1000;
  if (!isCleanAnswer(lossKW)) return null;
  const answerText = formatClean(lossKW);

  return {
    format: "numeric",
    params: {
      line_current: { value: I, unit: "A", realistic_range: [10, 100] },
      line_resistance: { value: R, unit: "ohm", realistic_range: [0.5, 5] },
    },
    answerValue: lossKW,
    answerUnit: "kW",
    answerText,
    facts: { I, R, lossW, lossKW },
    defaultStatement:
      `三相3線式送電線で線電流 I=${I}A が流れている。1線あたりの抵抗が R=${R}Ω のとき、` +
      `線路全体の電力損失 P_loss〔kW〕は?`,
    defaultSolution: [
      `三相3線式の線路損失 P_loss=3·I²·R`,
      `P_loss=3×${I}²×${R}=${formatClean(lossW)}W`,
      `=${answerText}kW`,
    ],
    physicallyValid: true,
  };
}

export const transmissionLoss: Template = {
  topic: "送電線の電力損失",
  subject: "電力",
  exam: "denken2_primary",
  difficulty: 2,
  paramSpecs: {
    line_current: { unit: "A", realistic_range: [10, 100] },
    line_resistance: { unit: "ohm", realistic_range: [0.5, 5] },
  },
  generate(rng) {
    return buildFrom(pick(I_SET, rng), pick(R_SET, rng));
  },
  generateFrom(params) {
    const { line_current, line_resistance } = params;
    if (line_current === undefined || line_resistance === undefined) return null;
    return buildFrom(line_current, line_resistance);
  },
};
