/**
 * テンプレート: 変圧器の最大効率を与える負荷率（機械・numeric）。
 *   鉄損=銅損 のとき最大効率 →  α = √(P_i / P_c)
 *     P_i=鉄損（無負荷損・一定）, P_c=全負荷銅損
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { pick } from "./helpers.js";
import type { GenerationResult, Template } from "./types.js";

// [P_i, P_c]（比が完全平方 → √ が綺麗）。
const PAIRS: ReadonlyArray<readonly [number, number]> = [
  [1, 4],
  [9, 16],
  [9, 25],
  [16, 25],
  [4, 25],
  [1, 16],
  [36, 49],
];

function buildFrom(pi: number, pc: number): GenerationResult | null {
  if (pi <= 0 || pc <= 0 || pi >= pc) return null;
  const alpha = Math.sqrt(pi / pc);
  if (!isCleanAnswer(alpha)) return null;
  const answerText = formatClean(alpha);
  return {
    format: "numeric",
    params: {
      iron_loss: { value: pi, unit: "kW", realistic_range: [1, 50] },
      copper_loss: { value: pc, unit: "kW", realistic_range: [1, 60] },
    },
    answerValue: alpha,
    answerUnit: "",
    answerText,
    facts: { pi, pc, alpha },
    defaultStatement: `変圧器の鉄損 P_i=${pi}kW、全負荷銅損 P_c=${pc}kW である。最大効率を与える負荷率 α は?`,
    defaultSolution: [
      `銅損は負荷率の2乗に比例: P_c'=α²·P_c。鉄損=銅損 で最大効率`,
      `α²·P_c=P_i → α=√(P_i/P_c)=√(${pi}/${pc})`,
      `α=${answerText}`,
    ],
    physicallyValid: true,
  };
}

export const maxEfficiencyLoad: Template = {
  topic: "変圧器の最大効率負荷率",
  subject: "機械",
  exam: "denken2_primary",
  difficulty: 3,
  paramSpecs: {
    iron_loss: { unit: "kW", realistic_range: [1, 50] },
    copper_loss: { unit: "kW", realistic_range: [1, 60] },
  },
  generate(rng) {
    const [pi, pc] = pick(PAIRS, rng);
    return buildFrom(pi, pc);
  },
  generateFrom(params) {
    const { iron_loss, copper_loss } = params;
    if (iron_loss === undefined || copper_loss === undefined) return null;
    return buildFrom(iron_loss, copper_loss);
  },
};
