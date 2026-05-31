/**
 * テンプレート: 不等率。
 *
 * 閉形式: 不等率 = (各負荷の個別最大需要の和) / 合成最大需要   （≧ 1）
 *
 * numeric 形式（選択肢なし・許容誤差つき）。
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { gradingTolerance } from "../quality.js";
import type { GenerationResult, Template } from "./types.js";

// 合成最大需要を基準にし、個別和 = 合成最大 × 不等率（整数）になる組で逆算。
const COMBINED_SET: ReadonlyArray<number> = [100, 120, 150, 200, 240, 300, 400];
const DF_SET: ReadonlyArray<number> = [1.1, 1.2, 1.25, 1.5];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(sumOfMax: number, combinedMax: number): GenerationResult | null {
  if (sumOfMax <= 0 || combinedMax <= 0 || combinedMax > sumOfMax) return null;
  const df = sumOfMax / combinedMax; // 正解（≧1）
  if (df < 1 || !isCleanAnswer(df)) return null;
  const answerText = formatClean(df);

  return {
    format: "numeric",
    params: {
      sum_of_individual_max: { value: sumOfMax, unit: "kW", realistic_range: [1, 10000] },
      combined_max: { value: combinedMax, unit: "kW", realistic_range: [1, 10000] },
    },
    answerValue: df,
    answerUnit: "",
    answerText,
    facts: { sumOfMax, combinedMax, df },
    numericTolerance: gradingTolerance(df),
    defaultStatement:
      `複数の負荷の個別最大需要の合計が ${sumOfMax}kW、合成最大需要が ${combinedMax}kW である。` + `不等率を求めよ。`,
    defaultSolution: [
      `不等率 = 個別最大需要の和 / 合成最大需要`,
      `= ${sumOfMax}/${combinedMax}`,
      `不等率 = ${answerText}`,
    ],
    physicallyValid: true,
  };
}

export const diversityFactor: Template = {
  topic: "不等率",
  subject: "電力",
  exam: "denken3",
  difficulty: 2,
  meta: {
    tags: ["電力", "需要と供給", "不等率"],
    formulas: ["不等率 = Σ個別最大需要 / 合成最大需要 (≧1)"],
    learningObjectives: ["不等率の定義を理解し、需要率・負荷率と混同せず計算できる"],
    hints: ["分子は個別最大の和", "分母は合成最大", "不等率は 1 以上"],
    prerequisites: ["需要率", "負荷率"],
    relatedTopics: ["需要率", "負荷率"],
    estimatedTimeSec: 90,
  },
  paramSpecs: {
    sum_of_individual_max: { unit: "kW", realistic_range: [1, 10000] },
    combined_max: { unit: "kW", realistic_range: [1, 10000] },
  },
  generate(rng) {
    const combined = pick(COMBINED_SET, rng);
    const df = pick(DF_SET, rng);
    const sum = combined * df;
    return buildFrom(sum, combined);
  },
  generateFrom(params) {
    const { sum_of_individual_max, combined_max } = params;
    if (sum_of_individual_max === undefined || combined_max === undefined) return null;
    return buildFrom(sum_of_individual_max, combined_max);
  },
};
