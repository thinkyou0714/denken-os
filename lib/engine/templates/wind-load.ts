/**
 * テンプレート: 架空電線への風圧荷重（法規・numeric）。
 *   風圧荷重  P = q · A   〔N〕（q=風圧〔Pa=N/m²〕, A=受圧面積〔m²〕）
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { defineTemplate, pick } from "./helpers.js";

const Q_SET: ReadonlyArray<number> = [490, 980, 1000, 1230, 2000, 2940];
const A_SET: ReadonlyArray<number> = [0.5, 1, 2, 3, 5];

type Params = {
  wind_pressure: number;
  area: number;
};

export const windLoad = defineTemplate<Params>({
  topic: "風圧荷重",
  subject: "法規",
  exam: "denken2_primary",
  difficulty: 2,
  pastExam: { area: "風圧荷重・機械的強度", frequency: "mid", years: [2009, 2014, 2019, 2024] },
  paramSpecs: {
    wind_pressure: { unit: "Pa", realistic_range: [400, 3000] },
    area: { unit: "m2", realistic_range: [0.5, 5] },
  },
  paramOrder: ["wind_pressure", "area"],
  draw(rng) {
    return {
      wind_pressure: pick(Q_SET, rng),
      area: pick(A_SET, rng),
    };
  },
  buildFrom({ wind_pressure: q, area: A }) {
    if (q <= 0 || A <= 0) return null;
    const P = q * A;
    if (!isCleanAnswer(P)) return null;
    const answerText = formatClean(P);
    return {
      format: "numeric",
      params: {
        wind_pressure: { value: q, unit: "Pa", realistic_range: [400, 3000] },
        area: { value: A, unit: "m2", realistic_range: [0.5, 5] },
      },
      answerValue: P,
      answerUnit: "N",
      answerText,
      facts: { q, A, P },
      defaultStatement: `架空電線に風圧 q=${q}Pa が作用している。受圧面積 A=${A}m² のとき、電線に加わる風圧荷重 P〔N〕は?`,
      defaultSolution: [`風圧荷重 P=q·A（Pa=N/m²）`, `P=${q}×${A}`, `P=${answerText}N`],
      physicallyValid: true,
    };
  },
});
