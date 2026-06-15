/**
 * テンプレート: 抵抗の温度変化（理論・numeric）。
 *   R2 = R1·{1 + α·(t2 − t1)}（α: 抵抗温度係数〔/K〕）
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { defineTemplate, pick } from "./helpers.js";

const R1_SET: ReadonlyArray<number> = [10, 20, 25, 50, 100, 200];
const ALPHA_SET: ReadonlyArray<number> = [0.002, 0.0025, 0.004, 0.005];
const DT_SET: ReadonlyArray<number> = [10, 20, 25, 40, 50, 75, 100];

type Params = {
  resistance_initial: number;
  temp_coefficient: number;
  temp_rise: number;
};

export const resistanceTemperature = defineTemplate<Params>({
  topic: "抵抗の温度変化",
  subject: "理論",
  exam: "denken2_primary",
  difficulty: 2,
  paramSpecs: {
    resistance_initial: { unit: "Ω", realistic_range: [1, 500] },
    temp_coefficient: { unit: "/K", realistic_range: [0.001, 0.006] },
    temp_rise: { unit: "K", realistic_range: [5, 120] },
  },
  paramOrder: ["resistance_initial", "temp_coefficient", "temp_rise"],
  draw(rng) {
    return {
      resistance_initial: pick(R1_SET, rng),
      temp_coefficient: pick(ALPHA_SET, rng),
      temp_rise: pick(DT_SET, rng),
    };
  },
  buildFrom({ resistance_initial: r1, temp_coefficient: alpha, temp_rise: dT }) {
    if (r1 <= 0 || alpha <= 0 || dT === 0) return null;
    const r2 = r1 * (1 + alpha * dT);
    if (!isCleanAnswer(r2)) return null;
    const answerText = formatClean(r2);
    return {
      format: "numeric",
      params: {
        resistance_initial: { value: r1, unit: "Ω", realistic_range: [1, 500] },
        temp_coefficient: { value: alpha, unit: "/K", realistic_range: [0.001, 0.006] },
        temp_rise: { value: dT, unit: "K", realistic_range: [5, 120] },
      },
      answerValue: r2,
      answerUnit: "Ω",
      answerText,
      facts: { r1, alpha, dT, r2 },
      defaultStatement:
        `温度 t1 で ${formatClean(r1)}Ω の抵抗線がある。抵抗温度係数を ${formatClean(alpha, 4)}/K とするとき、` +
        `温度が ${formatClean(dT)}K 上昇したあとの抵抗値〔Ω〕は?`,
      defaultSolution: [
        `R2=R1{1+α(t2−t1)}`,
        `=${formatClean(r1)}×(1+${formatClean(alpha, 4)}×${formatClean(dT)})`,
        `=${answerText}Ω`,
      ],
      physicallyValid: true,
    };
  },
});
