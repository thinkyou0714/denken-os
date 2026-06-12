/**
 * テンプレート: 短絡電流（オーム法）（二種二次・電力管理・descriptive）。
 *   三相短絡電流  Is = E / Z   〔A〕（E=相電圧, Z=故障点までの合成インピーダンス）
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { pick } from "./helpers.js";
import type { GenerationResult, Template } from "./types.js";

const E_SET: ReadonlyArray<number> = [100, 200, 400, 1000, 2000, 3810, 6350];
const Z_SET: ReadonlyArray<number> = [2, 4, 5, 8, 10, 20, 25];

function buildFrom(E: number, Z: number): GenerationResult | null {
  if (E <= 0 || Z <= 0) return null;
  const Is = E / Z;
  if (!isCleanAnswer(Is)) return null;
  const answerText = formatClean(Is);
  return {
    format: "descriptive",
    params: {
      phase_voltage: { value: E, unit: "V", realistic_range: [100, 6350] },
      impedance: { value: Z, unit: "ohm", realistic_range: [2, 25] },
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
}

export const shortCircuitOhm: Template = {
  topic: "短絡電流（オーム法）",
  subject: "電力管理",
  exam: "denken2_secondary",
  difficulty: 3,
  paramSpecs: {
    phase_voltage: { unit: "V", realistic_range: [100, 6350] },
    impedance: { unit: "ohm", realistic_range: [2, 25] },
  },
  generate(rng) {
    return buildFrom(pick(E_SET, rng), pick(Z_SET, rng));
  },
  generateFrom(params) {
    const { phase_voltage, impedance } = params;
    if (phase_voltage === undefined || impedance === undefined) return null;
    return buildFrom(phase_voltage, impedance);
  },
};
