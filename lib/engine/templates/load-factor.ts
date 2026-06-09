/**
 * テンプレート: 負荷率（電力・numeric）。
 *   負荷率 = 平均需要電力 / 最大需要電力 × 100   〔%〕
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

const MAX_SET: ReadonlyArray<number> = [100, 200, 250, 400, 500, 800, 1000];
// 平均需要は最大需要に対する比（綺麗な負荷率になる）。
const RATIO_SET: ReadonlyArray<number> = [0.4, 0.5, 0.6, 0.625, 0.75, 0.8];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(maxDemand: number, avgDemand: number): GenerationResult | null {
  if (maxDemand <= 0 || avgDemand <= 0 || avgDemand > maxDemand) return null;
  const lf = (avgDemand / maxDemand) * 100;
  if (!isCleanAnswer(lf) || !Number.isInteger(avgDemand)) return null;
  const answerText = formatClean(lf);
  return {
    format: "numeric",
    params: {
      max_demand: { value: maxDemand, unit: "kW", realistic_range: [100, 1000] },
      avg_demand: { value: avgDemand, unit: "kW", realistic_range: [40, 1000] },
    },
    answerValue: lf,
    answerUnit: "%",
    answerText,
    facts: { maxDemand, avgDemand, lf },
    defaultStatement: `ある需要家の最大需要電力 ${maxDemand}kW、平均需要電力 ${avgDemand}kW である。負荷率〔%〕は?`,
    defaultSolution: [`負荷率=平均需要/最大需要×100`, `=${avgDemand}/${maxDemand}×100`, `=${answerText}%`],
    physicallyValid: true,
  };
}

export const loadFactor: Template = {
  topic: "負荷率",
  subject: "電力",
  exam: "denken2_primary",
  difficulty: 2,
  paramSpecs: {
    max_demand: { unit: "kW", realistic_range: [100, 1000] },
    avg_demand: { unit: "kW", realistic_range: [40, 1000] },
  },
  generate(rng) {
    const maxDemand = pick(MAX_SET, rng);
    const avgDemand = maxDemand * pick(RATIO_SET, rng);
    return buildFrom(maxDemand, avgDemand);
  },
  generateFrom(params) {
    const { max_demand, avg_demand } = params;
    if (max_demand === undefined || avg_demand === undefined) return null;
    return buildFrom(max_demand, avg_demand);
  },
};
