/**
 * テンプレート: 平行平板コンデンサの電界（理論・numeric）。
 *   電界の強さ  E = V / d   〔kV/m〕（V〔V〕, d〔mm〕のとき E〔kV/m〕=V/d）
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { defineTemplate, pick } from "./helpers.js";

const V_SET: ReadonlyArray<number> = [100, 200, 300, 500, 1000, 2000, 3000, 6000];
const D_SET: ReadonlyArray<number> = [1, 2, 3, 5, 10];

type Params = {
  voltage: number;
  gap: number;
};

export const parallelPlateField = defineTemplate<Params>({
  topic: "平行平板コンデンサの電界",
  subject: "理論",
  exam: "denken2_primary",
  difficulty: 2,
  paramSpecs: {
    voltage: { unit: "V", realistic_range: [100, 6000] },
    gap: { unit: "mm", realistic_range: [1, 10] },
  },
  paramOrder: ["voltage", "gap"],
  draw(rng) {
    return {
      voltage: pick(V_SET, rng),
      gap: pick(D_SET, rng),
    };
  },
  buildFrom({ voltage: V, gap: d }) {
    if (V <= 0 || d <= 0) return null;
    const E = V / d; // kV/m （V[V]/d[mm]）
    if (!isCleanAnswer(E)) return null;
    const answerText = formatClean(E);
    return {
      format: "numeric",
      params: {
        voltage: { value: V, unit: "V", realistic_range: [100, 6000] },
        gap: { value: d, unit: "mm", realistic_range: [1, 10] },
      },
      answerValue: E,
      answerUnit: "kV/m",
      answerText,
      facts: { V, d, E },
      defaultStatement: `平行平板コンデンサの極板間隔 d=${d}mm に電圧 V=${V}V を加えた。極板間の電界の強さ E〔kV/m〕は?`,
      defaultSolution: [
        `一様電界 E=V/d`,
        `単位を揃える: V〔V〕/d〔mm〕=E〔kV/m〕（10⁻³ の相殺）`,
        `E=${V}/${d}=${answerText}kV/m`,
      ],
      physicallyValid: true,
    };
  },
});
