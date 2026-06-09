/**
 * テンプレート: 不等率（電力・numeric）。
 *   不等率 = 各個の最大需要電力の総和 / 合成最大需要電力   （≥1）
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

const SUM_SET: ReadonlyArray<number> = [120, 150, 160, 180, 200, 240, 300];
const COMPOSITE_SET: ReadonlyArray<number> = [80, 100, 120, 150, 160, 200];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(sum: number, composite: number): GenerationResult | null {
  if (sum <= 0 || composite <= 0 || sum < composite) return null;
  const df = sum / composite;
  if (!isCleanAnswer(df) || df < 1) return null;
  const answerText = formatClean(df);
  return {
    format: "numeric",
    params: {
      sum_of_maxima: { value: sum, unit: "kW", realistic_range: [100, 300] },
      composite_max: { value: composite, unit: "kW", realistic_range: [80, 200] },
    },
    answerValue: df,
    answerUnit: "",
    answerText,
    facts: { sum, composite, df },
    defaultStatement: `各需要家の最大需要電力の総和が ${sum}kW、合成最大需要電力が ${composite}kW である。不等率は?`,
    defaultSolution: [`不等率=各最大需要の総和/合成最大需要（≧1）`, `=${sum}/${composite}`, `=${answerText}`],
    physicallyValid: true,
  };
}

export const diversityFactor: Template = {
  topic: "不等率",
  subject: "電力",
  exam: "denken2_primary",
  difficulty: 2,
  paramSpecs: {
    sum_of_maxima: { unit: "kW", realistic_range: [100, 300] },
    composite_max: { unit: "kW", realistic_range: [80, 200] },
  },
  generate(rng) {
    return buildFrom(pick(SUM_SET, rng), pick(COMPOSITE_SET, rng));
  },
  generateFrom(params) {
    const { sum_of_maxima, composite_max } = params;
    if (sum_of_maxima === undefined || composite_max === undefined) return null;
    return buildFrom(sum_of_maxima, composite_max);
  },
};
