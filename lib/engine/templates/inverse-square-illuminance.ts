/**
 * テンプレート: 点光源の照度・逆二乗の法則（機械・numeric）。
 *   E = I / r²〔lx〕（I: 光度cd, r: 距離m。光に垂直な面の直下照度）
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { defineTemplate, pick } from "./helpers.js";

const I_SET: ReadonlyArray<number> = [100, 160, 200, 400, 500, 800, 1000, 2000];
const R_SET: ReadonlyArray<number> = [1, 2, 2.5, 4, 5, 10];

type Params = {
  luminous_intensity: number;
  distance: number;
};

export const inverseSquareIlluminance = defineTemplate<Params>({
  topic: "点光源の照度(逆二乗則)",
  subject: "機械",
  exam: "denken2_primary",
  difficulty: 2,
  paramSpecs: {
    luminous_intensity: { unit: "cd", realistic_range: [50, 5000] },
    distance: { unit: "m", realistic_range: [0.5, 20] },
  },
  paramOrder: ["luminous_intensity", "distance"],
  draw(rng) {
    return {
      luminous_intensity: pick(I_SET, rng),
      distance: pick(R_SET, rng),
    };
  },
  buildFrom({ luminous_intensity: luminous, distance: r }) {
    if (luminous <= 0 || r <= 0) return null;
    const e = luminous / (r * r);
    if (!isCleanAnswer(e)) return null;
    const answerText = formatClean(e);
    return {
      format: "numeric",
      params: {
        luminous_intensity: {
          value: luminous,
          unit: "cd",
          realistic_range: [50, 5000],
        },
        distance: { value: r, unit: "m", realistic_range: [0.5, 20] },
      },
      answerValue: e,
      answerUnit: "lx",
      answerText,
      facts: { luminous, r, e },
      defaultStatement: `光度 ${formatClean(luminous)}cd の点光源の直下 ${formatClean(r)}m における、光に垂直な面の照度〔lx〕は?`,
      defaultSolution: [
        `距離の逆二乗の法則 E=I/r²`,
        `=${formatClean(luminous)}/${formatClean(r * r)}`,
        `=${answerText}lx`,
      ],
      physicallyValid: true,
    };
  },
});
