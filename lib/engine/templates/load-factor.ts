/**
 * テンプレート: 負荷率。
 *
 * 閉形式: 負荷率 = 平均需要電力 / 最大需要電力 × 100   〔%〕
 *
 * numeric 形式（選択肢なし・許容誤差つき）。負荷率 ≤ 100% を担保。
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

const MAX_SET: ReadonlyArray<number> = [100, 120, 150, 200, 250, 400, 500];
// avg/max が綺麗な % になる比率。
const RATIO: ReadonlyArray<number> = [0.4, 0.45, 0.5, 0.6, 0.65, 0.75, 0.8];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(maxDemand: number, avgDemand: number): GenerationResult | null {
  if (maxDemand <= 0 || avgDemand <= 0 || avgDemand > maxDemand) return null;
  const lf = (avgDemand / maxDemand) * 100; // 正解
  if (!isCleanAnswer(lf)) return null;
  const answerText = formatClean(lf);

  return {
    format: "numeric",
    params: {
      max_demand: { value: maxDemand, unit: "kW", realistic_range: [1, 5000] },
      avg_demand: { value: avgDemand, unit: "kW", realistic_range: [1, 5000] },
    },
    answerValue: lf,
    answerUnit: "%",
    answerText,
    facts: { maxDemand, avgDemand, lf },
    numericTolerance: 0.1,
    defaultStatement:
      `ある需要家の最大需要電力が ${maxDemand}kW、平均需要電力が ${avgDemand}kW である。` + `負荷率〔%〕を求めよ。`,
    defaultSolution: [
      `負荷率 = 平均需要電力/最大需要電力 × 100`,
      `= ${avgDemand}/${maxDemand} × 100`,
      `負荷率 = ${answerText} %`,
    ],
    physicallyValid: true,
  };
}

export const loadFactor: Template = {
  topic: "負荷率",
  subject: "電力",
  exam: "denken3",
  difficulty: 1,
  meta: {
    tags: ["電力", "需要と供給", "負荷率"],
    formulas: ["負荷率 = 平均需要/最大需要 × 100"],
    learningObjectives: ["平均需要と最大需要から負荷率を求め、需要率・不等率と区別できる"],
    hints: ["分子は平均需要", "分母は最大需要", "負荷率は 100% を超えない"],
    prerequisites: ["電力量と平均電力"],
    relatedTopics: ["需要率", "不等率"],
    estimatedTimeSec: 90,
  },
  paramSpecs: {
    max_demand: { unit: "kW", realistic_range: [1, 5000] },
    avg_demand: { unit: "kW", realistic_range: [1, 5000] },
  },
  generate(rng) {
    const maxD = pick(MAX_SET, rng);
    const avgD = maxD * pick(RATIO, rng);
    return buildFrom(maxD, avgD);
  },
  generateFrom(params) {
    const { max_demand, avg_demand } = params;
    if (max_demand === undefined || avg_demand === undefined) return null;
    return buildFrom(max_demand, avg_demand);
  },
};
