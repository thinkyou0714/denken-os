/**
 * テンプレート: %インピーダンスと短絡電流（電力・numeric）。
 *   定格電流 In に対する三相短絡電流
 *     Is = In × 100 / %Z   〔A〕
 *   （%Z は基準容量におけるパーセントインピーダンス）
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { defineTemplate, pick } from "./helpers.js";

const IN_SET: ReadonlyArray<number> = [100, 150, 200, 250, 300, 400, 500];
const PZ_SET: ReadonlyArray<number> = [4, 5, 8, 10, 12.5, 20, 25];

type Params = {
  rated_current: number;
  percent_impedance: number;
};

export const percentImpedanceShortCircuit = defineTemplate<Params>({
  topic: "％インピーダンスと短絡電流",
  subject: "電力",
  exam: "denken2_primary",
  difficulty: 3,
  pastExam: { area: "短絡・％インピーダンス", frequency: "high", years: [2007, 2012, 2017, 2022] },
  paramSpecs: {
    rated_current: { unit: "A", realistic_range: [100, 500] },
    percent_impedance: { unit: "%", realistic_range: [4, 25] },
  },
  paramOrder: ["rated_current", "percent_impedance"],
  draw(rng) {
    return {
      rated_current: pick(IN_SET, rng),
      percent_impedance: pick(PZ_SET, rng),
    };
  },
  buildFrom({ rated_current: In, percent_impedance: pz }) {
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
  },
});
