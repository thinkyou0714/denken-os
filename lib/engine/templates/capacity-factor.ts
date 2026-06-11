/**
 * テンプレート: 設備利用率（電力・numeric）。
 *   設備利用率 = 発電電力量 / (定格出力 × 期間時間) × 100   〔%〕
 *   水力・風力・太陽光の出題で頻出（期間は30日=720hで固定し、綺麗な比を構成）。
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

const PERIOD_HOURS = 720; // 30日間
const P_SET: ReadonlyArray<number> = [100, 200, 500, 1000, 2000, 5000];
const RATIO_SET: ReadonlyArray<number> = [0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(rated: number, energy: number): GenerationResult | null {
  if (rated <= 0 || energy <= 0) return null;
  const cf = (energy / (rated * PERIOD_HOURS)) * 100;
  if (cf > 100 || !isCleanAnswer(cf) || !Number.isInteger(energy)) return null;
  const answerText = formatClean(cf);
  return {
    format: "numeric",
    params: {
      rated_output: { value: rated, unit: "kW", realistic_range: [50, 10000] },
      energy: { value: energy, unit: "kWh", realistic_range: [1000, 5000000] },
    },
    answerValue: cf,
    answerUnit: "%",
    answerText,
    facts: { rated, energy, cf, hours: PERIOD_HOURS },
    defaultStatement:
      `定格出力 ${rated}kW の発電設備が、30日間（${PERIOD_HOURS}時間）に ${energy}kWh を発電した。` +
      `この期間の設備利用率〔%〕は?`,
    defaultSolution: [
      `設備利用率=発電電力量/(定格出力×期間時間)×100`,
      `=${energy}/(${rated}×${PERIOD_HOURS})×100`,
      `=${answerText}%`,
    ],
    physicallyValid: true,
  };
}

export const capacityFactor: Template = {
  topic: "設備利用率",
  subject: "電力",
  exam: "denken2_primary",
  difficulty: 2,
  paramSpecs: {
    rated_output: { unit: "kW", realistic_range: [50, 10000] },
    energy: { unit: "kWh", realistic_range: [1000, 5000000] },
  },
  generate(rng) {
    const rated = pick(P_SET, rng);
    const energy = rated * PERIOD_HOURS * pick(RATIO_SET, rng);
    return buildFrom(rated, energy);
  },
  generateFrom(params) {
    const { rated_output, energy } = params;
    if (rated_output === undefined || energy === undefined) return null;
    return buildFrom(rated_output, energy);
  },
};
