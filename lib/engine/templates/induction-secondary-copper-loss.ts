/**
 * テンプレート: 三相誘導電動機の二次銅損（機械・numeric）。
 *   二次入力 P2・すべり s のとき、電力配分は P2:Pc2:Pm = 1:s:(1−s)。
 *     二次銅損 Pc2 = s·P2 〔kW〕（機械出力 Pm=(1−s)·P2）。
 *
 * 典型ミス（解説で言及）:
 *   ・Pc2=(1−s)·P2 と機械出力の式と取り違える
 *   ・二次入力ではなく一次入力に s を掛ける
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { defineTemplate, pick } from "./helpers.js";

const INPUT_SET: ReadonlyArray<number> = [5, 10, 15, 20, 30]; // 〔kW〕
const SLIP_SET: ReadonlyArray<number> = [0.03, 0.04, 0.05, 0.06, 0.08, 0.1];

type Params = {
  secondary_input: number;
  slip: number;
};

export const inductionSecondaryCopperLoss = defineTemplate<Params>({
  topic: "誘導電動機の二次銅損",
  subject: "機械",
  exam: "denken2_primary",
  difficulty: 2,
  pastExam: {
    area: "誘導機",
    frequency: "high",
    years: [2008, 2013, 2018, 2023],
    note: "二次入力P2・すべりs のとき 二次銅損 Pc2=s·P2、機械出力 Pm=(1−s)·P2（P2:Pc2:Pm=1:s:(1−s)）",
  },
  paramSpecs: {
    secondary_input: { unit: "kW", realistic_range: [5, 30] },
    slip: { realistic_range: [0.03, 0.1] },
  },
  paramOrder: ["secondary_input", "slip"],
  draw(rng) {
    return {
      secondary_input: pick(INPUT_SET, rng),
      slip: pick(SLIP_SET, rng),
    };
  },
  buildFrom({ secondary_input: p2, slip: s }) {
    const Pc2 = s * p2; // 二次銅損〔kW〕
    if (Pc2 <= 0) return null;
    if (!isCleanAnswer(Pc2)) return null;
    const answerText = formatClean(Pc2);
    return {
      format: "numeric",
      params: {
        secondary_input: { value: p2, unit: "kW", realistic_range: [5, 30] },
        slip: { value: s, realistic_range: [0.03, 0.1] },
      },
      answerValue: Pc2,
      answerUnit: "kW",
      answerText,
      facts: { p2, s, Pc2 },
      defaultStatement:
        `三相誘導電動機の二次入力が P2=${formatClean(p2)}kW、すべりが s=${formatClean(s)} である。` +
        `二次銅損 Pc2〔kW〕はいくらか。`,
      defaultSolution: [
        `二次入力P2・すべりs の電力配分は P2:Pc2:Pm=1:s:(1−s)`,
        `二次銅損 Pc2=s·P2=${formatClean(s)}×${formatClean(p2)}`,
        `Pc2=${answerText}kW`,
      ],
      physicallyValid: true,
    };
  },
});
