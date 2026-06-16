/**
 * テンプレート: RC 直列回路の時定数（理論・numeric）。
 *   時定数  τ = R·C
 *   R を〔kΩ〕、C を〔μF〕で与えると  τ〔ms〕 = R〔kΩ〕 × C〔μF〕
 *   （kΩ×μF = 10³ × 10⁻⁶ s = 10⁻³ s = 1ms）
 *
 * 典型ミス: 単位換算（kΩ・μF を SI に直さず ms を s と取り違える）。
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { seriesRCFigure } from "../figures/index.js";
import { defineTemplate, pick } from "./helpers.js";

const R_SET: ReadonlyArray<number> = [1, 2, 4, 5, 10, 20, 47, 100];
const C_SET: ReadonlyArray<number> = [1, 2, 4, 5, 10, 22, 47];

type Params = {
  resistance: number;
  capacitance: number;
};

export const rcTimeConstant = defineTemplate<Params>({
  topic: "RC回路の時定数",
  subject: "理論",
  exam: "denken3",
  difficulty: 1,
  pastExam: { area: "単相交流回路", frequency: "high", years: [2007, 2011, 2016, 2021] },
  paramSpecs: {
    resistance: { unit: "kohm", realistic_range: [1, 100] },
    capacitance: { unit: "uF", realistic_range: [1, 100] },
  },
  paramOrder: ["resistance", "capacitance"],
  draw(rng) {
    return {
      resistance: pick(R_SET, rng),
      capacitance: pick(C_SET, rng),
    };
  },
  buildFrom({ resistance: R, capacitance: C }) {
    if (R <= 0 || C <= 0) return null;
    const tau = R * C; // ms
    if (!isCleanAnswer(tau)) return null;
    const answerText = formatClean(tau);
    return {
      format: "numeric",
      params: {
        resistance: { value: R, unit: "kohm", realistic_range: [1, 100] },
        capacitance: { value: C, unit: "uF", realistic_range: [1, 100] },
      },
      answerValue: tau,
      answerUnit: "ms",
      answerText,
      facts: { R, C, tau },
      defaultStatement: `抵抗 R=${R}kΩ とコンデンサ C=${C}μF を直列に接続した RC 回路の時定数 τ〔ms〕は?`,
      defaultSolution: [
        `時定数 τ=R·C`,
        `kΩ×μF=10³×10⁻⁶ s=10⁻³ s=1ms なので τ〔ms〕=R〔kΩ〕×C〔μF〕`,
        `τ=${R}×${C}=${answerText}ms`,
      ],
      figure: seriesRCFigure(R, C),
      physicallyValid: true,
    };
  },
});
