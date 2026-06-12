/**
 * テンプレート: 誘導電動機の二次入力・出力（機械・numeric）。
 *   二次入力 P2 : 二次銅損 Pc2 : 機械的出力 Pm = 1 : s : (1−s)
 *   機械的出力  Pm = P2·(1−s)   〔kW〕
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { pick } from "./helpers.js";
import type { GenerationResult, Template } from "./types.js";

const P2_SET: ReadonlyArray<number> = [5, 8, 10, 12, 15, 20, 30, 40];
const S_SET: ReadonlyArray<number> = [0.02, 0.03, 0.04, 0.05, 0.06, 0.08, 0.1];

function buildFrom(P2: number, s: number): GenerationResult | null {
  if (P2 <= 0 || s <= 0 || s >= 1) return null;
  const Pm = P2 * (1 - s);
  if (!isCleanAnswer(Pm)) return null;
  const answerText = formatClean(Pm);
  const sPercent = formatClean(s * 100);

  return {
    format: "numeric",
    params: {
      secondary_input: { value: P2, unit: "kW", realistic_range: [5, 40] },
      slip: { value: s, unit: "", realistic_range: [0.01, 0.1] },
    },
    answerValue: Pm,
    answerUnit: "kW",
    answerText,
    facts: { P2, s, Pm },
    defaultStatement:
      `三相誘導電動機の二次入力が P2=${P2}kW、滑り s=${sPercent}% である。` +
      `機械的出力 Pm〔kW〕は?（P2:Pc2:Pm=1:s:(1−s)）`,
    defaultSolution: [`P2:Pc2:Pm=1:s:(1−s) より Pm=P2·(1−s)`, `Pm=${P2}×(1−${s})`, `Pm=${answerText}kW`],
    physicallyValid: true,
  };
}

export const inductionPowerBalance: Template = {
  topic: "誘導電動機の二次効率",
  subject: "機械",
  exam: "denken2_primary",
  difficulty: 2,
  paramSpecs: {
    secondary_input: { unit: "kW", realistic_range: [5, 40] },
    slip: { unit: "", realistic_range: [0.01, 0.1] },
  },
  generate(rng) {
    return buildFrom(pick(P2_SET, rng), pick(S_SET, rng));
  },
  generateFrom(params) {
    const { secondary_input, slip } = params;
    if (secondary_input === undefined || slip === undefined) return null;
    return buildFrom(secondary_input, slip);
  },
};
