/**
 * テンプレート: 短絡電流（オーム法）（二種二次・電力管理・descriptive）。
 *   三相短絡電流  Is = E / Z   〔A〕（E=相電圧, Z=故障点までの合成インピーダンス）
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { defineTemplate, pick } from "./helpers.js";

const E_SET: ReadonlyArray<number> = [100, 200, 400, 1000, 2000, 3810, 6350];
const Z_SET: ReadonlyArray<number> = [2, 4, 5, 8, 10, 20, 25];

type Params = {
  phase_voltage: number;
  impedance: number;
};

export const shortCircuitOhm = defineTemplate<Params>({
  topic: "短絡電流（オーム法）",
  subject: "電力管理",
  exam: "denken2_secondary",
  difficulty: 3,
  pastExam: { area: "短絡・故障計算", frequency: "high", years: [2007, 2012, 2017, 2022] },
  paramSpecs: {
    phase_voltage: { unit: "V", realistic_range: [100, 6350] },
    impedance: { unit: "Ω", realistic_range: [2, 25] },
  },
  paramOrder: ["phase_voltage", "impedance"],
  draw(rng) {
    return {
      phase_voltage: pick(E_SET, rng),
      impedance: pick(Z_SET, rng),
    };
  },
  buildFrom({ phase_voltage: E, impedance: Z }) {
    if (E <= 0 || Z <= 0) return null;
    const Is = E / Z;
    if (!isCleanAnswer(Is)) return null;
    const answerText = formatClean(Is);
    return {
      format: "descriptive",
      params: {
        phase_voltage: { value: E, unit: "V", realistic_range: [100, 6350] },
        impedance: { value: Z, unit: "Ω", realistic_range: [2, 25] },
      },
      answerValue: Is,
      answerUnit: "A",
      answerText,
      facts: { E, Z, Is },
      defaultStatement:
        `相電圧 E=${E}V、故障点までの合成インピーダンス Z=${Z}Ω である。` +
        `三相短絡電流 Is〔A〕をオーム法により導出過程とともに求めよ。`,
      defaultSolution: [`オーム法: Is=E/Z（E=相電圧、Z=合成インピーダンス）`, `Is=${E}/${Z}`, `Is=${answerText}A`],
      physicallyValid: true,
    };
  },
});
