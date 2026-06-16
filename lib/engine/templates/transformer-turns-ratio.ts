/**
 * テンプレート: 変圧器の巻数比と電流（機械・numeric）。
 *   巻数比  a = N1/N2 = V1/V2 = I2/I1
 *   一次電流 I1 から二次電流  I2 = I1·(V1/V2)  〔A〕
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { transformerFigure } from "../figures/index.js";
import { defineTemplate, pick } from "./helpers.js";

// [一次電圧 V1, 二次電圧 V2]（a=V1/V2 が綺麗）。
const VV_SET: ReadonlyArray<readonly [number, number]> = [
  [6600, 200],
  [6600, 100],
  [3300, 100],
  [3300, 110],
  [200, 100],
  [440, 110],
];
const I1_SET: ReadonlyArray<number> = [2, 3, 5, 8, 10];

type Params = {
  primary_voltage: number;
  secondary_voltage: number;
  primary_current: number;
};

export const transformerTurnsRatio = defineTemplate<Params>({
  topic: "変圧器の巻数比",
  subject: "機械",
  exam: "denken3",
  difficulty: 1,
  pastExam: { area: "変圧器", frequency: "high", years: [2006, 2011, 2016, 2021] },
  paramSpecs: {
    primary_voltage: { unit: "V", realistic_range: [100, 6600] },
    secondary_voltage: { unit: "V", realistic_range: [100, 6600] },
    primary_current: { unit: "A", realistic_range: [1, 10] },
  },
  paramOrder: ["primary_voltage", "secondary_voltage", "primary_current"],
  draw(rng) {
    const [V1, V2] = pick(VV_SET, rng);
    return {
      primary_voltage: V1,
      secondary_voltage: V2,
      primary_current: pick(I1_SET, rng),
    };
  },
  buildFrom({ primary_voltage: V1, secondary_voltage: V2, primary_current: I1 }) {
    if (V1 <= 0 || V2 <= 0 || I1 <= 0) return null;
    const a = V1 / V2;
    const I2 = I1 * a;
    if (!isCleanAnswer(a) || !isCleanAnswer(I2)) return null;
    const answerText = formatClean(I2);
    return {
      format: "numeric",
      params: {
        primary_voltage: { value: V1, unit: "V", realistic_range: [100, 6600] },
        secondary_voltage: { value: V2, unit: "V", realistic_range: [100, 6600] },
        primary_current: { value: I1, unit: "A", realistic_range: [1, 10] },
      },
      answerValue: I2,
      answerUnit: "A",
      answerText,
      facts: { V1, V2, I1, a, I2 },
      defaultStatement:
        `一次電圧 V1=${V1}V、二次電圧 V2=${V2}V の単相変圧器で、一次電流 I1=${I1}A が流れている。` +
        `二次電流 I2〔A〕は?（損失は無視）`,
      defaultSolution: [
        `巻数比 a=V1/V2=${formatClean(a)}`,
        `電流比は逆比 I2/I1=a なので I2=I1·a=${I1}×${formatClean(a)}`,
        `I2=${answerText}A`,
      ],
      figure: transformerFigure(V1, V2, a),
      physicallyValid: true,
    };
  },
});
