/**
 * テンプレート: 合成最大需要電力（電力管理・二次・numeric）。
 *   合成最大需要電力 = Σ(設備容量×需要率) / 不等率
 *   需要率・不等率・負荷率の複合運用（変圧器容量選定の実務計算）。
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

const CAPA_SET: ReadonlyArray<number> = [200, 300, 400, 500, 600, 800];
const DF_SET: ReadonlyArray<number> = [0.4, 0.5, 0.6, 0.75, 0.8];
const DIV_SET: ReadonlyArray<number> = [1.2, 1.25, 1.5, 2];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(capA: number, dfA: number, capB: number, dfB: number, div: number): GenerationResult | null {
  if (capA <= 0 || capB <= 0 || dfA <= 0 || dfA > 1 || dfB <= 0 || dfB > 1 || div < 1) return null;
  const sumMax = capA * dfA + capB * dfB;
  const composite = sumMax / div;
  if (!isCleanAnswer(sumMax) || !isCleanAnswer(composite)) return null;
  const answerText = formatClean(composite);
  return {
    format: "numeric",
    params: {
      capacity_a: { value: capA, unit: "kW", realistic_range: [50, 2000] },
      demand_factor_a: { value: dfA, realistic_range: [0.2, 1] },
      capacity_b: { value: capB, unit: "kW", realistic_range: [50, 2000] },
      demand_factor_b: { value: dfB, realistic_range: [0.2, 1] },
      diversity: { value: div, realistic_range: [1, 3] },
    },
    answerValue: composite,
    answerUnit: "kW",
    answerText,
    facts: { capA, dfA, capB, dfB, div, sumMax, composite },
    defaultStatement:
      `需要家Aは設備容量 ${formatClean(capA)}kW・需要率 ${formatClean(dfA * 100)}%、` +
      `需要家Bは設備容量 ${formatClean(capB)}kW・需要率 ${formatClean(dfB * 100)}% である。` +
      `両者間の不等率を ${formatClean(div)} とするとき、合成最大需要電力〔kW〕は?`,
    defaultSolution: [
      `各需要家の最大需要電力=設備容量×需要率 → A: ${formatClean(capA * dfA)}kW, B: ${formatClean(capB * dfB)}kW`,
      `合成最大需要電力=Σ最大需要電力/不等率=${formatClean(sumMax)}/${formatClean(div)}`,
      `=${answerText}kW`,
    ],
    physicallyValid: true,
  };
}

export const maxDemandComposite: Template = {
  topic: "合成最大需要電力",
  subject: "電力管理",
  exam: "denken2_secondary",
  difficulty: 3,
  paramSpecs: {
    capacity_a: { unit: "kW", realistic_range: [50, 2000] },
    demand_factor_a: { realistic_range: [0.2, 1] },
    capacity_b: { unit: "kW", realistic_range: [50, 2000] },
    demand_factor_b: { realistic_range: [0.2, 1] },
    diversity: { realistic_range: [1, 3] },
  },
  generate(rng) {
    return buildFrom(
      pick(CAPA_SET, rng),
      pick(DF_SET, rng),
      pick(CAPA_SET, rng),
      pick(DF_SET, rng),
      pick(DIV_SET, rng),
    );
  },
  generateFrom(params) {
    const { capacity_a, demand_factor_a, capacity_b, demand_factor_b, diversity } = params;
    if (
      capacity_a === undefined ||
      demand_factor_a === undefined ||
      capacity_b === undefined ||
      demand_factor_b === undefined ||
      diversity === undefined
    ) {
      return null;
    }
    return buildFrom(capacity_a, demand_factor_a, capacity_b, demand_factor_b, diversity);
  },
};
