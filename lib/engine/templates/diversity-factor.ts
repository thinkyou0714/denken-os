/**
 * テンプレート: 不等率（電力・numeric）。
 *   不等率 = 各個の最大需要電力の総和 / 合成最大需要電力   （≥1）
 *
 * 新規テンプレートはこの形（defineTemplate ファクトリ）を標準とする。
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { defineTemplate, pick } from "./helpers.js";

const SUM_SET: ReadonlyArray<number> = [120, 150, 160, 180, 200, 240, 300];
const COMPOSITE_SET: ReadonlyArray<number> = [80, 100, 120, 150, 160, 200];

type Params = {
  sum_of_maxima: number;
  composite_max: number;
};

export const diversityFactor = defineTemplate<Params>({
  topic: "不等率",
  subject: "電力",
  exam: "denken2_primary",
  difficulty: 2,
  pastExam: { area: "配電・需要計算", frequency: "mid", years: [2008, 2013, 2018, 2023] },
  paramSpecs: {
    sum_of_maxima: { unit: "kW", realistic_range: [100, 300] },
    composite_max: { unit: "kW", realistic_range: [80, 200] },
  },
  paramOrder: ["sum_of_maxima", "composite_max"],
  draw(rng) {
    return {
      sum_of_maxima: pick(SUM_SET, rng),
      composite_max: pick(COMPOSITE_SET, rng),
    };
  },
  buildFrom({ sum_of_maxima: sum, composite_max: composite }) {
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
  },
});
