/**
 * テンプレート: 送電線の電圧降下率（電力・numeric）。
 *   電圧降下率  ε = (Vs − Vr) / Vr × 100   〔%〕
 *
 * 新規テンプレートはこの形（defineTemplate ファクトリ）を標準とする。
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { defineTemplate, pick } from "./helpers.js";

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

type Params = {
  sending_voltage: number;
  receiving_voltage: number;
};

export const voltageDropRate = defineTemplate<Params>({
  topic: "電圧降下率",
  subject: "電力",
  exam: "denken2_primary",
  difficulty: 2,
  paramSpecs: {
    sending_voltage: { unit: "V", realistic_range: [100, 6600] },
    receiving_voltage: { unit: "V", realistic_range: [100, 6600] },
  },
  paramOrder: ["sending_voltage", "receiving_voltage"],
  draw(rng) {
    const [Vs, Vr] = pick(V_PAIRS, rng);
    return {
      sending_voltage: Vs,
      receiving_voltage: Vr,
    };
  },
  buildFrom({ sending_voltage: Vs, receiving_voltage: Vr }) {
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
  },
});
