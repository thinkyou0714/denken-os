/**
 * テンプレート: 最大電力伝送（理論・numeric）。
 *   テブナン等価電源 E〔V〕・内部抵抗 R〔Ω〕に負荷を整合(R_L=R)させたときの
 *   負荷側最大電力  P_max = E² / (4R)  〔W〕
 *
 * 典型ミス（解説で言及）:
 *   ・E²/R … 内部抵抗を無視（負荷=電源に直結）
 *   ・E²/(2R) … 電源が供給する全電力（半分は内部で消費）と混同
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { maxPowerFigure } from "../figures/index.js";
import { defineTemplate, pick } from "./helpers.js";

const E_SET: ReadonlyArray<number> = [20, 40, 60, 100, 120, 200];
const R_SET: ReadonlyArray<number> = [2, 4, 5, 8, 10];

type Params = {
  emf: number;
  internal_resistance: number;
};

export const maxPowerTransfer = defineTemplate<Params>({
  topic: "最大電力伝送",
  subject: "理論",
  exam: "denken2_primary",
  difficulty: 2,
  pastExam: { area: "直流回路", frequency: "mid", years: [2009, 2014, 2019, 2024] },
  paramSpecs: {
    emf: { unit: "V", realistic_range: [10, 200] },
    internal_resistance: { unit: "ohm", realistic_range: [1, 20] },
  },
  paramOrder: ["emf", "internal_resistance"],
  draw(rng) {
    return {
      emf: pick(E_SET, rng),
      internal_resistance: pick(R_SET, rng),
    };
  },
  buildFrom({ emf: E, internal_resistance: R }) {
    if (E <= 0 || R <= 0) return null;
    const pMax = (E * E) / (4 * R); // 正解(W)
    if (!isCleanAnswer(pMax)) return null;
    const answerText = formatClean(pMax);
    return {
      format: "numeric",
      params: {
        emf: { value: E, unit: "V", realistic_range: [10, 200] },
        internal_resistance: { value: R, unit: "ohm", realistic_range: [1, 20] },
      },
      answerValue: pMax,
      answerUnit: "W",
      answerText,
      facts: { E, R, pMax },
      defaultStatement:
        `起電力 E=${E}V、内部抵抗 R=${R}Ω のテブナン等価電源に可変抵抗負荷を接続する。` +
        `負荷で消費する電力が最大となるときの最大電力 P_max〔W〕は?`,
      defaultSolution: [
        `最大電力伝送は負荷抵抗 R_L=R（内部抵抗に整合）のとき`,
        `このとき I=E/(2R)、負荷電圧=E/2`,
        `P_max=(E/2)²/R=E²/(4R)=${E}²/(4×${R})=${answerText}W`,
        `（参考: このとき電源の全供給電力 E²/(2R) の半分が負荷に伝わる）`,
      ],
      figure: maxPowerFigure(E, R),
      physicallyValid: true,
    };
  },
});
