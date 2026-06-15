/**
 * テンプレート: パーセントインピーダンスの基準容量換算（電力・numeric）。
 *   %Z は容量に比例する:  %Z2 = %Z1 × (P2 / P1)   〔%〕
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { defineTemplate, pick } from "./helpers.js";

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

type Params = {
  percent_impedance: number;
  base_capacity: number;
  target_capacity: number;
};

export const percentImpedanceConversion = defineTemplate<Params>({
  topic: "％インピーダンスの容量換算",
  subject: "電力",
  exam: "denken2_primary",
  difficulty: 3,
  paramSpecs: {
    percent_impedance: { unit: "%", realistic_range: [4, 12.5] },
    base_capacity: { unit: "MVA", realistic_range: [5, 100] },
    target_capacity: { unit: "MVA", realistic_range: [5, 100] },
  },
  paramOrder: ["percent_impedance", "base_capacity", "target_capacity"],
  draw(rng) {
    const [P1, P2] = pick(P_PAIRS, rng);
    return {
      percent_impedance: pick(PZ_SET, rng),
      base_capacity: P1,
      target_capacity: P2,
    };
  },
  buildFrom({ percent_impedance: pz1, base_capacity: P1, target_capacity: P2 }) {
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
  },
});
