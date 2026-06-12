/**
 * テンプレート: %インピーダンスと短絡電流（電力・numeric）。
 *   定格電流 In に対する三相短絡電流
 *     Is = In × 100 / %Z   〔A〕
 *   （%Z は基準容量におけるパーセントインピーダンス）
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { pick } from "./helpers.js";
import type { GenerationResult, Template } from "./types.js";

const IN_SET: ReadonlyArray<number> = [100, 150, 200, 250, 300, 400, 500];
const PZ_SET: ReadonlyArray<number> = [4, 5, 8, 10, 12.5, 20, 25];

function buildFrom(In: number, pz: number): GenerationResult | null {
  if (In <= 0 || pz <= 0) return null;
  const Is = (In * 100) / pz;
  if (!isCleanAnswer(Is)) return null;
  const answerText = formatClean(Is);

  return {
    format: "numeric",
    params: {
      rated_current: { value: In, unit: "A", realistic_range: [100, 500] },
      percent_impedance: { value: pz, unit: "%", realistic_range: [4, 25] },
    },
    answerValue: Is,
    answerUnit: "A",
    answerText,
    facts: { In, pz, Is },
    defaultStatement:
      `定格電流 In=${In}A の系統で、基準容量におけるパーセントインピーダンスが %Z=${pz}% である。` +
      `三相短絡電流 Is〔A〕は?`,
    defaultSolution: [`短絡電流 Is=In×100/%Z`, `Is=${In}×100/${pz}`, `Is=${answerText}A`],
    physicallyValid: true,
  };
}

export const percentImpedanceShortCircuit: Template = {
  topic: "％インピーダンスと短絡電流",
  subject: "電力",
  exam: "denken2_primary",
  difficulty: 3,
  paramSpecs: {
    rated_current: { unit: "A", realistic_range: [100, 500] },
    percent_impedance: { unit: "%", realistic_range: [4, 25] },
  },
  generate(rng) {
    return buildFrom(pick(IN_SET, rng), pick(PZ_SET, rng));
  },
  generateFrom(params) {
    const { rated_current, percent_impedance } = params;
    if (rated_current === undefined || percent_impedance === undefined) return null;
    return buildFrom(rated_current, percent_impedance);
  },
};
