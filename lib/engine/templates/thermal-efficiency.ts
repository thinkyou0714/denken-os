/**
 * テンプレート: 汽力発電所の発電端熱効率（二種二次・電力管理・descriptive）。
 *   1kWh = 3600kJ より  η = 3600 / q × 100   〔%〕
 *     q = 発電端の熱消費率〔kJ/(kW·h)〕
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

const Q_SET: ReadonlyArray<number> = [7200, 7500, 8000, 9000, 10000];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(q: number): GenerationResult | null {
  if (q <= 0) return null;
  const eta = (3600 / q) * 100;
  if (!isCleanAnswer(eta)) return null;
  const answerText = formatClean(eta);

  return {
    format: "descriptive",
    params: {
      heat_rate: { value: q, unit: "kJ/kWh", realistic_range: [7000, 10000] },
    },
    answerValue: eta,
    answerUnit: "%",
    answerText,
    facts: { q, eta },
    defaultStatement:
      `ある汽力発電所の発電端熱消費率が q=${q}kJ/(kW·h) である。` + `発電端熱効率 η〔%〕を導出過程とともに求めよ。`,
    defaultSolution: [`1kWh=3600kJ なので η=3600/q×100`, `η=3600/${q}×100`, `η=${answerText}%`],
    physicallyValid: true,
  };
}

export const thermalEfficiency: Template = {
  topic: "汽力発電の熱効率",
  subject: "電力管理",
  exam: "denken2_secondary",
  difficulty: 4,
  paramSpecs: {
    heat_rate: { unit: "kJ/kWh", realistic_range: [7000, 10000] },
  },
  generate(rng) {
    return buildFrom(pick(Q_SET, rng));
  },
  generateFrom(params) {
    const { heat_rate } = params;
    if (heat_rate === undefined) return null;
    return buildFrom(heat_rate);
  },
};
