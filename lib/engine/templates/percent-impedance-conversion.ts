/**
 * テンプレート: パーセントインピーダンスの基準容量換算（電力・numeric）。
 *   %Z は容量に比例する:  %Z2 = %Z1 × (P2 / P1)   〔%〕
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { pick } from "./helpers.js";
import type { GenerationResult, Template } from "./types.js";

const PZ_SET: ReadonlyArray<number> = [4, 5, 8, 10, 12.5];
// [基準容量 P1, 換算先 P2]（P2/P1 が綺麗）。
const P_PAIRS: ReadonlyArray<readonly [number, number]> = [
  [10, 50],
  [10, 20],
  [10, 100],
  [20, 100],
  [5, 10],
  [50, 100],
];

function buildFrom(pz1: number, P1: number, P2: number): GenerationResult | null {
  if (pz1 <= 0 || P1 <= 0 || P2 <= 0) return null;
  const pz2 = pz1 * (P2 / P1);
  if (!isCleanAnswer(pz2)) return null;
  const answerText = formatClean(pz2);
  return {
    format: "numeric",
    params: {
      percent_impedance: { value: pz1, unit: "%", realistic_range: [4, 12.5] },
      base_capacity: { value: P1, unit: "MVA", realistic_range: [5, 100] },
      target_capacity: { value: P2, unit: "MVA", realistic_range: [5, 100] },
    },
    answerValue: pz2,
    answerUnit: "%",
    answerText,
    facts: { pz1, P1, P2, pz2 },
    defaultStatement: `基準容量 ${P1}MVA で %Z=${pz1}% のインピーダンスを、基準容量 ${P2}MVA に換算した %Z〔%〕は?`,
    defaultSolution: [`%Z は基準容量に比例: %Z2=%Z1×(P2/P1)`, `%Z2=${pz1}×(${P2}/${P1})`, `%Z2=${answerText}%`],
    physicallyValid: true,
  };
}

export const percentImpedanceConversion: Template = {
  topic: "％インピーダンスの容量換算",
  subject: "電力",
  exam: "denken2_primary",
  difficulty: 3,
  paramSpecs: {
    percent_impedance: { unit: "%", realistic_range: [4, 12.5] },
    base_capacity: { unit: "MVA", realistic_range: [5, 100] },
    target_capacity: { unit: "MVA", realistic_range: [5, 100] },
  },
  generate(rng) {
    const [P1, P2] = pick(P_PAIRS, rng);
    return buildFrom(pick(PZ_SET, rng), P1, P2);
  },
  generateFrom(params) {
    const { percent_impedance, base_capacity, target_capacity } = params;
    if (percent_impedance === undefined || base_capacity === undefined || target_capacity === undefined) {
      return null;
    }
    return buildFrom(percent_impedance, base_capacity, target_capacity);
  },
};
