/**
 * テンプレート: 損失係数と負荷率（電力管理・二次・numeric）。
 *   配電系統の損失電力量の見積りに使う経験式:
 *     F = α·L + (1−α)·L²  （α=0.3 が代表値。L: 負荷率〔小数〕）
 *   負荷率から損失係数を求める（年間損失電力量の算定の核）。
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

const ALPHA = 0.3;
const L_SET: ReadonlyArray<number> = [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(loadFactor: number): GenerationResult | null {
  if (loadFactor <= 0 || loadFactor > 1) return null;
  const f = (ALPHA * loadFactor + (1 - ALPHA) * loadFactor * loadFactor) * 100; // %
  if (!isCleanAnswer(f)) return null;
  const answerText = formatClean(f);
  return {
    format: "numeric",
    params: {
      load_factor: { value: loadFactor, realistic_range: [0.1, 1] },
    },
    answerValue: f,
    answerUnit: "%",
    answerText,
    facts: { loadFactor, alpha: ALPHA, f },
    defaultStatement:
      `負荷率が ${formatClean(loadFactor)}（=${formatClean(loadFactor * 100)}%）の配電系統について、` +
      `経験式 F=0.3L+0.7L² を用いて損失係数〔%〕を求めよ。`,
    defaultSolution: [
      `損失係数の経験式 F=αL+(1−α)L²（α=0.3）`,
      `=0.3×${formatClean(loadFactor)}+0.7×${formatClean(loadFactor * loadFactor, 4)}`,
      `=${answerText}%`,
    ],
    physicallyValid: true,
  };
}

export const lossFactor: Template = {
  topic: "損失係数と負荷率",
  subject: "電力管理",
  exam: "denken2_secondary",
  difficulty: 3,
  paramSpecs: {
    load_factor: { realistic_range: [0.1, 1] },
  },
  generate(rng) {
    return buildFrom(pick(L_SET, rng));
  },
  generateFrom(params) {
    const { load_factor } = params;
    if (load_factor === undefined) return null;
    return buildFrom(load_factor);
  },
};
