/**
 * テンプレート: 変圧器の効率（機械・numeric）。
 *   η = P_out / (P_out + P_i + P_c) × 100  〔%〕
 *     P_out=出力, P_i=鉄損(無負荷損), P_c=銅損(負荷損)
 *   綺麗な η になる (P_out, P_i, P_c) の組のみ採用する。
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { pick } from "./helpers.js";
import type { GenerationResult, Template } from "./types.js";

// [出力 P_out(kW), 鉄損 P_i(kW), 銅損 P_c(kW)] — η が綺麗(整数 or .5%)になる組。
const TUPLES: ReadonlyArray<readonly [number, number, number]> = [
  [900, 40, 60],
  [950, 20, 30],
  [475, 10, 15],
  [970, 12, 18],
  [864, 16, 20],
  [882, 8, 10],
  [1880, 40, 80],
  [1990, 4, 6],
];

function buildFrom(pout: number, pi: number, pc: number): GenerationResult | null {
  if (pout <= 0 || pi <= 0 || pc <= 0) return null;
  const eta = (pout / (pout + pi + pc)) * 100;
  if (!isCleanAnswer(eta)) return null;
  const answerText = formatClean(eta);

  return {
    format: "numeric",
    params: {
      output_power: { value: pout, unit: "kW", realistic_range: [300, 2000] },
      iron_loss: { value: pi, unit: "kW", realistic_range: [1, 60] },
      copper_loss: { value: pc, unit: "kW", realistic_range: [1, 100] },
    },
    answerValue: eta,
    answerUnit: "%",
    answerText,
    facts: { pout, pi, pc, eta },
    defaultStatement:
      `ある変圧器が出力 P_out=${pout}kW で運転している。鉄損 P_i=${pi}kW、銅損 P_c=${pc}kW のとき、` + `効率 η〔%〕は?`,
    defaultSolution: [`η=P_out/(P_out+P_i+P_c)×100`, `η=${pout}/(${pout}+${pi}+${pc})×100`, `η=${answerText}%`],
    physicallyValid: true,
  };
}

export const transformerEfficiency: Template = {
  topic: "変圧器の効率",
  subject: "機械",
  exam: "denken2_primary",
  difficulty: 3,
  paramSpecs: {
    output_power: { unit: "kW", realistic_range: [300, 2000] },
    iron_loss: { unit: "kW", realistic_range: [1, 60] },
    copper_loss: { unit: "kW", realistic_range: [1, 100] },
  },
  generate(rng) {
    const [pout, pi, pc] = pick(TUPLES, rng);
    return buildFrom(pout, pi, pc);
  },
  generateFrom(params) {
    const { output_power, iron_loss, copper_loss } = params;
    if (output_power === undefined || iron_loss === undefined || copper_loss === undefined) return null;
    return buildFrom(output_power, iron_loss, copper_loss);
  },
};
