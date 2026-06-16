/**
 * テンプレート: 調速機の速度調定率（電力・numeric）。
 *   速度調定率 δ = (無負荷時回転速度 N0 − 定格回転速度 Nn) / Nn × 100〔%〕
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { defineTemplate, pick } from "./helpers.js";

const NN_SET: ReadonlyArray<number> = [300, 360, 400, 500, 600, 750, 1000, 1500];
const DELTA_SET: ReadonlyArray<number> = [2, 2.5, 3, 4, 5];

type Params = {
  no_load_speed: number;
  rated_speed: number;
};

export const speedRegulation = defineTemplate<Params>({
  topic: "調速機の速度調定率",
  subject: "電力",
  exam: "denken2_primary",
  difficulty: 3,
  pastExam: { area: "水力発電", frequency: "mid", years: [2011, 2017, 2023] },
  paramSpecs: {
    no_load_speed: { unit: "min^-1", realistic_range: [300, 1600] },
    rated_speed: { unit: "min^-1", realistic_range: [250, 1500] },
  },
  paramOrder: ["no_load_speed", "rated_speed"],
  draw(rng) {
    const nn = pick(NN_SET, rng);
    const delta = pick(DELTA_SET, rng);
    const n0 = nn * (1 + delta / 100);
    return { no_load_speed: n0, rated_speed: nn };
  },
  buildFrom({ no_load_speed: n0, rated_speed: nn }) {
    if (nn <= 0 || n0 <= nn) return null;
    const delta = ((n0 - nn) / nn) * 100;
    if (!isCleanAnswer(delta) || !isCleanAnswer(n0)) return null;
    const answerText = formatClean(delta);
    return {
      format: "numeric",
      params: {
        no_load_speed: { value: n0, unit: "min^-1", realistic_range: [300, 1600] },
        rated_speed: { value: nn, unit: "min^-1", realistic_range: [250, 1500] },
      },
      answerValue: delta,
      answerUnit: "%",
      answerText,
      facts: { n0, nn, delta },
      defaultStatement:
        `定格出力時の回転速度が ${formatClean(nn)}min⁻¹、無負荷時の回転速度が ${formatClean(n0)}min⁻¹ の` +
        `水車発電機がある。調速機の速度調定率〔%〕は?`,
      defaultSolution: [
        `速度調定率 δ=(N0−Nn)/Nn×100`,
        `=(${formatClean(n0)}−${formatClean(nn)})/${formatClean(nn)}×100`,
        `=${answerText}%`,
      ],
      physicallyValid: true,
    };
  },
});
