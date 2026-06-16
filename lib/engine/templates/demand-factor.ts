/**
 * テンプレート: 需要率（電力・numeric 形式）。
 *   需要率〔%〕 = 最大需要電力 / 設備容量 × 100
 * 正解はコードで算出。設備容量 > 最大需要 で、結果が綺麗になる組のみ採用。
 *
 * 新規テンプレートはこの形（defineTemplate ファクトリ）を標準とする。
 */
import { isCleanAnswer } from "../clean.js";
import { defineTemplate, pick } from "./helpers.js";

const INSTALLED: ReadonlyArray<number> = [50, 80, 100, 120, 150, 200, 250]; // 設備容量 kW
const MAX_DEMAND: ReadonlyArray<number> = [30, 40, 45, 60, 75, 90, 120, 150, 180]; // 最大需要 kW

type Params = {
  installed_capacity: number;
  max_demand: number;
};

export const demandFactor = defineTemplate<Params>({
  topic: "需要率",
  subject: "電力",
  exam: "denken3",
  difficulty: 1,
  pastExam: { area: "配電・需要計算", frequency: "high", years: [2007, 2011, 2015, 2019, 2023] },
  paramSpecs: {
    installed_capacity: { unit: "kW", realistic_range: [10, 1000] },
    max_demand: { unit: "kW", realistic_range: [1, 1000] },
  },
  paramOrder: ["installed_capacity", "max_demand"],
  draw(rng) {
    return {
      installed_capacity: pick(INSTALLED, rng),
      max_demand: pick(MAX_DEMAND, rng),
    };
  },
  buildFrom({ installed_capacity: installed, max_demand: maxDemand }) {
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
      facts: { installed, maxDemand, demandFactor: df },
      defaultStatement: `ある需要家の設備容量が${installed}kW、最大需要電力が${maxDemand}kWである。需要率〔%〕を求めよ。`,
      defaultSolution: [
        "需要率 = 最大需要電力 / 設備容量 × 100",
        `= ${maxDemand} / ${installed} × 100`,
        `= ${answerText}%`,
      ],
      physicallyValid: true,
    };
  },
});
