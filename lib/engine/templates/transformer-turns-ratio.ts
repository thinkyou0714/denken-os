/**
 * テンプレート: 変圧器の巻数比と電流（機械・numeric）。
 *   巻数比  a = N1/N2 = V1/V2 = I2/I1
 *   一次電流 I1 から二次電流  I2 = I1·(V1/V2)  〔A〕
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { transformerFigure } from "../figures/index.js";
import { pick } from "./helpers.js";
import type { GenerationResult, Template } from "./types.js";

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

function buildFrom(V1: number, V2: number, I1: number): GenerationResult | null {
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
}

export const transformerTurnsRatio: Template = {
  topic: "変圧器の巻数比",
  subject: "機械",
  exam: "denken3",
  difficulty: 1,
  paramSpecs: {
    primary_voltage: { unit: "V", realistic_range: [100, 6600] },
    secondary_voltage: { unit: "V", realistic_range: [100, 6600] },
    primary_current: { unit: "A", realistic_range: [1, 10] },
  },
  generate(rng) {
    const [V1, V2] = pick(VV_SET, rng);
    return buildFrom(V1, V2, pick(I1_SET, rng));
  },
  generateFrom(params) {
    const { primary_voltage, secondary_voltage, primary_current } = params;
    if (primary_voltage === undefined || secondary_voltage === undefined || primary_current === undefined) {
      return null;
    }
    return buildFrom(primary_voltage, secondary_voltage, primary_current);
  },
};
