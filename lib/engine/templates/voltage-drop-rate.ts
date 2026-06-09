/**
 * テンプレート: 送電線の電圧降下率（電力・numeric）。
 *   電圧降下率  ε = (Vs − Vr) / Vr × 100   〔%〕
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

// [送電端 Vs, 受電端 Vr]（ε が綺麗）。
const V_PAIRS: ReadonlyArray<readonly [number, number]> = [
  [210, 200],
  [220, 200],
  [216, 200],
  [208, 200],
  [105, 100],
  [3300, 3000],
  [6300, 6000],
  [6600, 6000],
];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(Vs: number, Vr: number): GenerationResult | null {
  if (Vs <= 0 || Vr <= 0 || Vs < Vr) return null;
  const eps = ((Vs - Vr) / Vr) * 100;
  if (!isCleanAnswer(eps)) return null;
  const answerText = formatClean(eps);
  return {
    format: "numeric",
    params: {
      sending_voltage: { value: Vs, unit: "V", realistic_range: [100, 6600] },
      receiving_voltage: { value: Vr, unit: "V", realistic_range: [100, 6600] },
    },
    answerValue: eps,
    answerUnit: "%",
    answerText,
    facts: { Vs, Vr, eps },
    defaultStatement: `送電端電圧 Vs=${Vs}V、受電端電圧 Vr=${Vr}V である。電圧降下率 ε〔%〕は?`,
    defaultSolution: [`電圧降下率 ε=(Vs−Vr)/Vr×100`, `ε=(${Vs}−${Vr})/${Vr}×100`, `ε=${answerText}%`],
    physicallyValid: true,
  };
}

export const voltageDropRate: Template = {
  topic: "電圧降下率",
  subject: "電力",
  exam: "denken2_primary",
  difficulty: 2,
  paramSpecs: {
    sending_voltage: { unit: "V", realistic_range: [100, 6600] },
    receiving_voltage: { unit: "V", realistic_range: [100, 6600] },
  },
  generate(rng) {
    const [Vs, Vr] = pick(V_PAIRS, rng);
    return buildFrom(Vs, Vr);
  },
  generateFrom(params) {
    const { sending_voltage, receiving_voltage } = params;
    if (sending_voltage === undefined || receiving_voltage === undefined) return null;
    return buildFrom(sending_voltage, receiving_voltage);
  },
};
