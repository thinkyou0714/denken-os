/**
 * テンプレート: 支線の安全率（法規・numeric）。
 *   電技解釈 第61条: 支線の安全率は原則 2.5 以上。
 *   必要な引張強さ = 想定最大張力 × 2.5〔kN〕
 *   ※ 特定の施設条件（61条ただし書等）では 1.5 まで緩和され得るが、適用条件の説明が
 *     長くなり誤解を生むため、本テンプレは**原則 2.5 のみ**を出題する
 *     （Codexレビュー指摘: 木柱=一律1.5 という旧出題は条件不備のため撤回）。
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

const SAFETY_FACTOR = 2.5;
const T_SET: ReadonlyArray<number> = [2, 4, 6, 8, 10, 12, 16, 20];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(tension: number): GenerationResult | null {
  if (tension <= 0) return null;
  const required = tension * SAFETY_FACTOR;
  if (!isCleanAnswer(required)) return null;
  const answerText = formatClean(required);
  return {
    format: "numeric",
    params: {
      max_tension: { value: tension, unit: "kN", realistic_range: [1, 50] },
    },
    answerValue: required,
    answerUnit: "kN",
    answerText,
    facts: { tension, safetyFactor: SAFETY_FACTOR, required },
    defaultStatement:
      `架空電線路の支持物を支える支線に想定される最大張力が ${formatClean(tension)}kN である。` +
      `この支線に最低限必要な引張強さ〔kN〕は?（安全率は電技解釈第61条の原則による）`,
    defaultSolution: [
      `電技解釈第61条: 支線の安全率は原則2.5以上（特定の施設条件では1.5まで緩和され得るが本問は原則）`,
      `必要引張強さ=想定最大張力×安全率=${formatClean(tension)}×${formatClean(SAFETY_FACTOR)}`,
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
  },
  generate(rng) {
    return buildFrom(pick(T_SET, rng));
  },
  generateFrom(params) {
    const { max_tension } = params;
    if (max_tension === undefined) return null;
    return buildFrom(max_tension);
  },
};
