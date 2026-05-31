/**
 * テンプレート: 需要率（電力・numeric 形式）。
 *   需要率〔%〕 = 最大需要電力 / 設備容量 × 100
 * 正解はコードで算出。設備容量 > 最大需要 で、結果が綺麗になる組のみ採用。
 */
import { isCleanAnswer } from "../clean.js";
import { gradingTolerance } from "../quality.js";
import type { GenerationResult, Template } from "./types.js";

const INSTALLED = [50, 80, 100, 120, 150, 200, 250]; // 設備容量 kW
const MAX_DEMAND = [30, 40, 45, 60, 75, 90, 120, 150, 180]; // 最大需要 kW

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(installed: number, maxDemand: number): GenerationResult | null {
  if (installed <= 0 || maxDemand <= 0 || maxDemand >= installed) return null;
  const df = (maxDemand / installed) * 100;
  if (!isCleanAnswer(df)) return null;
  const answerText = String(Number(df.toFixed(2)));
  return {
    format: "numeric",
    params: {
      installed_capacity: { value: installed, unit: "kW", realistic_range: [10, 1000] },
      max_demand: { value: maxDemand, unit: "kW", realistic_range: [1, 1000] },
    },
    answerValue: df,
    answerUnit: "%",
    answerText,
    numericTolerance: gradingTolerance(df),
    facts: { installed, maxDemand, demandFactor: df },
    defaultStatement: `ある需要家の設備容量が${installed}kW、最大需要電力が${maxDemand}kWである。需要率〔%〕を求めよ。`,
    defaultSolution: [
      "需要率 = 最大需要電力 / 設備容量 × 100",
      `= ${maxDemand} / ${installed} × 100`,
      `= ${answerText}%`,
    ],
    physicallyValid: true,
  };
}

export const demandFactor: Template = {
  topic: "需要率",
  subject: "電力",
  exam: "denken3",
  difficulty: 1,
  paramSpecs: {
    installed_capacity: { unit: "kW", realistic_range: [10, 1000] },
    max_demand: { unit: "kW", realistic_range: [1, 1000] },
  },
  generate(rng) {
    return buildFrom(pick(INSTALLED, rng), pick(MAX_DEMAND, rng));
  },
  generateFrom(params) {
    const { installed_capacity, max_demand } = params;
    if (installed_capacity === undefined || max_demand === undefined) return null;
    return buildFrom(installed_capacity, max_demand);
  },
};
