/**
 * テンプレート: クーロンの法則（理論・numeric）。
 *   F = k·q1·q2 / r²,  k = 9×10⁹ N·m²/C²（試験標準の近似値）
 *   q を μC で与えると F = 9×10⁻³·q1·q2/r²〔N〕。
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { defineTemplate, pick } from "./helpers.js";

const Q_SET: ReadonlyArray<number> = [1, 2, 3, 4, 5, 6, 8, 10];
const R_SET: ReadonlyArray<number> = [0.1, 0.2, 0.3, 0.5, 1];

type Params = {
  charge1: number;
  charge2: number;
  distance: number;
};

export const coulombForce = defineTemplate<Params>({
  topic: "クーロンの法則",
  subject: "理論",
  exam: "denken2_primary",
  difficulty: 2,
  paramSpecs: {
    charge1: { unit: "μC", realistic_range: [0.5, 20] },
    charge2: { unit: "μC", realistic_range: [0.5, 20] },
    distance: { unit: "m", realistic_range: [0.05, 2] },
  },
  paramOrder: ["charge1", "charge2", "distance"],
  draw(rng) {
    return {
      charge1: pick(Q_SET, rng),
      charge2: pick(Q_SET, rng),
      distance: pick(R_SET, rng),
    };
  },
  buildFrom({ charge1: q1, charge2: q2, distance: r }) {
    if (q1 <= 0 || q2 <= 0 || r <= 0) return null;
    const f = (9e-3 * q1 * q2) / (r * r); // N（qはμC）
    if (!isCleanAnswer(f)) return null;
    const answerText = formatClean(f);
    return {
      format: "numeric",
      params: {
        charge1: { value: q1, unit: "μC", realistic_range: [0.5, 20] },
        charge2: { value: q2, unit: "μC", realistic_range: [0.5, 20] },
        distance: { value: r, unit: "m", realistic_range: [0.05, 2] },
      },
      answerValue: f,
      answerUnit: "N",
      answerText,
      facts: { q1, q2, r, f },
      defaultStatement:
        `真空中で ${formatClean(q1)}μC と ${formatClean(q2)}μC の点電荷を ${formatClean(r)}m 離して置いたとき、` +
        `両電荷間に働く静電力の大きさ〔N〕は?（クーロン定数 k=9×10⁹N·m²/C²）`,
      defaultSolution: [
        `F=k·q1·q2/r²（クーロンの法則）`,
        `=9×10⁹×${formatClean(q1)}×10⁻⁶×${formatClean(q2)}×10⁻⁶/${formatClean(r * r, 4)}`,
        `=${answerText}N`,
      ],
      physicallyValid: true,
    };
  },
});
