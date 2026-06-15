/**
 * テンプレート: 一線地絡電流（対称座標法）（二種二次・電力管理・descriptive）。
 *   Ig = 3·E / (Z0 + Z1 + Z2)   〔A〕
 *     E=相電圧, Z0/Z1/Z2=零相/正相/逆相インピーダンス
 *   （正相=逆相と仮定し Z1=Z2 を採る代表問題）
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { defineTemplate, pick } from "./helpers.js";

const E_SET: ReadonlyArray<number> = [200, 400, 1000, 3810, 6350];
const Z1_SET: ReadonlyArray<number> = [2, 5, 8, 10, 15];
const Z0_SET: ReadonlyArray<number> = [2, 4, 5, 10, 20];

type Params = {
  phase_voltage: number;
  positive_seq: number;
  zero_seq: number;
};

export const groundFaultSymmetrical = defineTemplate<Params>({
  topic: "一線地絡電流（対称座標法）",
  subject: "電力管理",
  exam: "denken2_secondary",
  difficulty: 4,
  paramSpecs: {
    phase_voltage: { unit: "V", realistic_range: [100, 6350] },
    positive_seq: { unit: "ohm", realistic_range: [1, 20] },
    zero_seq: { unit: "ohm", realistic_range: [1, 20] },
  },
  paramOrder: ["phase_voltage", "positive_seq", "zero_seq"],
  draw(rng) {
    return {
      phase_voltage: pick(E_SET, rng),
      positive_seq: pick(Z1_SET, rng),
      zero_seq: pick(Z0_SET, rng),
    };
  },
  buildFrom({ phase_voltage: E, positive_seq: Z1, zero_seq: Z0 }) {
    if (E <= 0 || Z1 <= 0 || Z0 <= 0) return null;
    const sum = Z0 + 2 * Z1; // Z0 + Z1 + Z2（Z1=Z2）
    const Ig = (3 * E) / sum;
    if (!isCleanAnswer(Ig)) return null;
    const answerText = formatClean(Ig);
    return {
      format: "descriptive",
      params: {
        phase_voltage: { value: E, unit: "V", realistic_range: [100, 6350] },
        positive_seq: { value: Z1, unit: "ohm", realistic_range: [1, 20] },
        zero_seq: { value: Z0, unit: "ohm", realistic_range: [1, 20] },
      },
      answerValue: Ig,
      answerUnit: "A",
      answerText,
      facts: { E, Z1, Z0, sum, Ig },
      defaultStatement:
        `相電圧 E=${E}V、正相=逆相インピーダンス Z1=Z2=${Z1}Ω、零相インピーダンス Z0=${Z0}Ω である。` +
        `一線地絡電流 Ig〔A〕を対称座標法 Ig=3E/(Z0+Z1+Z2) により導出過程とともに求めよ。`,
      defaultSolution: [
        `対称座標法: 一線地絡では Ig=3E/(Z0+Z1+Z2)`,
        `Z0+Z1+Z2=${Z0}+${Z1}+${Z1}=${sum}Ω`,
        `Ig=3×${E}/${sum}`,
        `Ig=${answerText}A`,
      ],
      physicallyValid: true,
    };
  },
});
