/**
 * テンプレート: 直流発電機の誘導起電力（機械・numeric）。
 *   誘導起電力  E = V + Ia·Ra   〔V〕（端子電圧Vに電機子抵抗降下を足す）
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { pick } from "./helpers.js";
import type { GenerationResult, Template } from "./types.js";

const V_SET: ReadonlyArray<number> = [100, 110, 200, 220];
const IA_SET: ReadonlyArray<number> = [10, 20, 25, 40, 50];
const RA_SET: ReadonlyArray<number> = [0.1, 0.2, 0.4, 0.5, 1];

function buildFrom(V: number, Ia: number, Ra: number): GenerationResult | null {
  if (V <= 0 || Ia <= 0 || Ra <= 0) return null;
  const E = V + Ia * Ra;
  if (!isCleanAnswer(E)) return null;
  const answerText = formatClean(E);
  return {
    format: "numeric",
    params: {
      terminal_voltage: { value: V, unit: "V", realistic_range: [100, 220] },
      armature_current: { value: Ia, unit: "A", realistic_range: [10, 50] },
      armature_resistance: { value: Ra, unit: "ohm", realistic_range: [0.1, 1] },
    },
    answerValue: E,
    answerUnit: "V",
    answerText,
    facts: { V, Ia, Ra, E },
    defaultStatement:
      `端子電圧 V=${V}V の直流発電機が電機子電流 Ia=${Ia}A を供給している。` +
      `電機子抵抗 Ra=${Ra}Ω のとき、誘導起電力 E〔V〕は?`,
    defaultSolution: [`発電機は E=V+Ia·Ra（電動機の E=V−Ia·Ra と符号が逆）`, `E=${V}+${Ia}×${Ra}`, `E=${answerText}V`],
    physicallyValid: true,
  };
}

export const dcGeneratorEmf: Template = {
  topic: "直流発電機の誘導起電力",
  subject: "機械",
  exam: "denken3",
  difficulty: 2,
  paramSpecs: {
    terminal_voltage: { unit: "V", realistic_range: [100, 220] },
    armature_current: { unit: "A", realistic_range: [10, 50] },
    armature_resistance: { unit: "ohm", realistic_range: [0.1, 1] },
  },
  generate(rng) {
    return buildFrom(pick(V_SET, rng), pick(IA_SET, rng), pick(RA_SET, rng));
  },
  generateFrom(params) {
    const { terminal_voltage, armature_current, armature_resistance } = params;
    if (terminal_voltage === undefined || armature_current === undefined || armature_resistance === undefined) {
      return null;
    }
    return buildFrom(terminal_voltage, armature_current, armature_resistance);
  },
};
