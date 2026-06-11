/**
 * テンプレート: 支線の安全率（法規・numeric）。
 *   電技解釈 第61条: 支線の安全率は2.5以上（木柱・A種鉄筋コンクリート柱等は1.5以上）。
 *   必要な引張強さ = 想定最大張力 × 安全率〔kN〕
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

const T_SET: ReadonlyArray<number> = [4, 6, 8, 10, 12, 16, 20];
const SF_CASES: ReadonlyArray<readonly [number, string]> = [
  [2.5, "鉄柱を支持する支線（原則）"],
  [1.5, "木柱を支持する支線"],
];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(tension: number, safetyFactor: number): GenerationResult | null {
  const sfCase = SF_CASES.find(([sf]) => sf === safetyFactor);
  if (!sfCase || tension <= 0) return null;
  const required = tension * safetyFactor;
  if (!isCleanAnswer(required)) return null;
  const answerText = formatClean(required);
  return {
    format: "numeric",
    params: {
      max_tension: { value: tension, unit: "kN", realistic_range: [1, 50] },
      safety_factor: { value: safetyFactor, realistic_range: [1.5, 2.5] },
    },
    answerValue: required,
    answerUnit: "kN",
    answerText,
    facts: { tension, safetyFactor, required },
    defaultStatement:
      `${sfCase[1]}に想定される最大張力が ${formatClean(tension)}kN のとき、` +
      `この支線に最低限必要な引張強さ〔kN〕は?（安全率は電技解釈第61条による）`,
    defaultSolution: [
      `電技解釈第61条: 支線の安全率は原則2.5以上（木柱等は1.5以上）→ 本問は ${formatClean(safetyFactor)}`,
      `必要引張強さ=想定最大張力×安全率=${formatClean(tension)}×${formatClean(safetyFactor)}`,
      `=${answerText}kN`,
    ],
    physicallyValid: true,
  };
}

export const guyWireSafety: Template = {
  topic: "支線の安全率",
  subject: "法規",
  exam: "denken2_primary",
  difficulty: 2,
  paramSpecs: {
    max_tension: { unit: "kN", realistic_range: [1, 50] },
    safety_factor: { realistic_range: [1.5, 2.5] },
  },
  generate(rng) {
    const [sf] = pick(SF_CASES, rng);
    return buildFrom(pick(T_SET, rng), sf);
  },
  generateFrom(params) {
    const { max_tension, safety_factor } = params;
    if (max_tension === undefined || safety_factor === undefined) return null;
    return buildFrom(max_tension, safety_factor);
  },
};
