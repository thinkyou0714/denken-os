/**
 * テンプレート: 点電荷の電位（理論・numeric）。
 *   真空中の点電荷 Q が距離 r の点につくる電位:
 *     V = Q/(4πε0·r) = k·Q/r,  k = 9×10⁹ N·m²/C²（試験標準の近似値）
 *   Q を nC で与えると V = 9×10⁹·(Q×10⁻⁹)/r = 9·Q/r〔V〕。
 *
 * 典型ミス（解説で言及）:
 *   ・V=kQ/r² … 電界 E の式（r²）と電位 V（r）を取り違える
 *   ・nC→C 換算（×10⁻⁹）を忘れる
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { defineTemplate, pick } from "./helpers.js";

const CHARGE_SET: ReadonlyArray<number> = [1, 2, 3, 5, 10, 20]; // 〔nC〕
const DISTANCE_SET: ReadonlyArray<number> = [0.3, 0.5, 0.6, 0.9, 1, 1.5, 3]; // 〔m〕

type Params = {
  charge: number;
  distance: number;
};

export const pointChargePotential = defineTemplate<Params>({
  topic: "点電荷の電位",
  subject: "理論",
  exam: "denken2_primary",
  difficulty: 2,
  pastExam: {
    area: "静電気",
    frequency: "high",
    years: [2007, 2012, 2017, 2022],
    note: "点電荷の電位 V=Q/(4πε0r)=k·Q/r、k=9×10⁹",
  },
  paramSpecs: {
    charge: { unit: "nC", realistic_range: [1, 20] },
    distance: { unit: "m", realistic_range: [0.3, 3] },
  },
  paramOrder: ["charge", "distance"],
  draw(rng) {
    return {
      charge: pick(CHARGE_SET, rng),
      distance: pick(DISTANCE_SET, rng),
    };
  },
  buildFrom({ charge, distance }) {
    if (charge <= 0 || distance <= 0) return null;
    const v = (9e9 * (charge * 1e-9)) / distance; // 電位 V〔V〕（charge は nC）
    if (!isCleanAnswer(v)) return null;
    const answerText = formatClean(v);
    return {
      format: "numeric",
      params: {
        charge: { value: charge, unit: "nC", realistic_range: [1, 20] },
        distance: { value: distance, unit: "m", realistic_range: [0.3, 3] },
      },
      answerValue: v,
      answerUnit: "V",
      answerText,
      facts: { charge, distance, v },
      defaultStatement:
        `真空中に置かれた点電荷 Q=${formatClean(charge)}nC から ${formatClean(distance)}m 離れた点の電位 V〔V〕は?` +
        `（クーロン定数 k=9×10⁹N·m²/C²）`,
      defaultSolution: [
        `点電荷の電位 V=k·Q/r（k=9×10⁹）`,
        `V=9×10⁹×${formatClean(charge)}×10⁻⁹/${formatClean(distance)}`,
        `V=${answerText}V`,
      ],
      physicallyValid: true,
    };
  },
});
