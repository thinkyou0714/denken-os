/**
 * テンプレート: 調速機の速度調定率（電力・numeric）。
 *   速度調定率 δ = (無負荷時回転速度 N0 − 定格回転速度 Nn) / Nn × 100〔%〕
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

const NN_SET: ReadonlyArray<number> = [300, 360, 400, 500, 600, 750, 1000, 1500];
const DELTA_SET: ReadonlyArray<number> = [2, 2.5, 3, 4, 5];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(n0: number, nn: number): GenerationResult | null {
  if (nn <= 0 || n0 <= nn) return null;
  const delta = ((n0 - nn) / nn) * 100;
  if (!isCleanAnswer(delta) || !isCleanAnswer(n0)) return null;
  const answerText = formatClean(delta);
  return {
    format: "numeric",
    params: {
      no_load_speed: { value: n0, unit: "min^-1", realistic_range: [300, 1600] },
      rated_speed: { value: nn, unit: "min^-1", realistic_range: [250, 1500] },
    },
    answerValue: delta,
    answerUnit: "%",
    answerText,
    facts: { n0, nn, delta },
    defaultStatement:
      `定格出力時の回転速度が ${formatClean(nn)}min⁻¹、無負荷時の回転速度が ${formatClean(n0)}min⁻¹ の` +
      `水車発電機がある。調速機の速度調定率〔%〕は?`,
    defaultSolution: [
      `速度調定率 δ=(N0−Nn)/Nn×100`,
      `=(${formatClean(n0)}−${formatClean(nn)})/${formatClean(nn)}×100`,
      `=${answerText}%`,
    ],
    physicallyValid: true,
  };
}

export const speedRegulation: Template = {
  topic: "調速機の速度調定率",
  subject: "電力",
  exam: "denken2_primary",
  difficulty: 3,
  paramSpecs: {
    no_load_speed: { unit: "min^-1", realistic_range: [300, 1600] },
    rated_speed: { unit: "min^-1", realistic_range: [250, 1500] },
  },
  generate(rng) {
    const nn = pick(NN_SET, rng);
    const delta = pick(DELTA_SET, rng);
    const n0 = nn * (1 + delta / 100);
    return buildFrom(n0, nn);
  },
  generateFrom(params) {
    const { no_load_speed, rated_speed } = params;
    if (no_load_speed === undefined || rated_speed === undefined) return null;
    return buildFrom(no_load_speed, rated_speed);
  },
};
