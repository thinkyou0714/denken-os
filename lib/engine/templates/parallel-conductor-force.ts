/**
 * テンプレート: 平行導体間の電磁力（理論・numeric）。
 *   無限長平行導体に流れる電流 I1, I2 が距離 d で及ぼし合う単位長あたりの力:
 *     F/l = μ0·I1·I2/(2πd) = 2×10⁻⁷·I1·I2/d    〔N/m〕
 *   同方向電流は吸引、逆方向電流は反発。
 *
 * 典型ミス（解説で言及）:
 *   ・μ0/(4π) を使う … 係数を 2×10⁻⁷ ではなく 1×10⁻⁷ にする
 *   ・d² で割る … クーロン力と混同し距離の2乗で割る
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { defineTemplate, pick } from "./helpers.js";

const CURRENT_SET: ReadonlyArray<number> = [50, 100, 200, 300, 400, 500]; // 〔A〕
const DISTANCE_SET: ReadonlyArray<number> = [0.1, 0.2, 0.5, 1]; // 〔m〕

type Params = {
  current1: number;
  current2: number;
  distance: number;
};

export const parallelConductorForce = defineTemplate<Params>({
  topic: "平行導体間の電磁力",
  subject: "理論",
  exam: "denken2_primary",
  difficulty: 2,
  pastExam: {
    area: "電磁気",
    frequency: "mid",
    years: [2008, 2013, 2018, 2023],
    note: "F/l=μ0·I1·I2/(2πd)=2×10⁻⁷·I1·I2/d。同方向電流は吸引",
  },
  paramSpecs: {
    current1: { unit: "A", realistic_range: [50, 500] },
    current2: { unit: "A", realistic_range: [50, 500] },
    distance: { unit: "m", realistic_range: [0.1, 1] },
  },
  paramOrder: ["current1", "current2", "distance"],
  draw(rng) {
    return {
      current1: pick(CURRENT_SET, rng),
      current2: pick(CURRENT_SET, rng),
      distance: pick(DISTANCE_SET, rng),
    };
  },
  buildFrom({ current1, current2, distance }) {
    if (current1 <= 0 || current2 <= 0 || distance <= 0) return null;
    const f = (2e-7 * current1 * current2) / distance; // 単位長あたりの力〔N/m〕
    if (f <= 0) return null;
    if (!isCleanAnswer(f)) return null;
    const answerText = formatClean(f);
    return {
      format: "numeric",
      params: {
        current1: { value: current1, unit: "A", realistic_range: [50, 500] },
        current2: { value: current2, unit: "A", realistic_range: [50, 500] },
        distance: { value: distance, unit: "m", realistic_range: [0.1, 1] },
      },
      answerValue: f,
      answerUnit: "N/m",
      answerText,
      facts: { current1, current2, distance, f },
      defaultStatement:
        `真空中で距離 d=${formatClean(distance)}m を隔てて平行に置かれた2本の長い導体に、` +
        `それぞれ I1=${formatClean(current1)}A、I2=${formatClean(current2)}A の電流を流したとき、` +
        `導体の単位長あたりに働く力の大きさ〔N/m〕は?`,
      defaultSolution: [
        `平行導体間に働く力 F/l=μ0·I1·I2/(2πd)=2×10⁻⁷·I1·I2/d`,
        `F=2×10⁻⁷×${formatClean(current1)}×${formatClean(current2)}/${formatClean(distance)}`,
        `F=${answerText}N/m`,
      ],
      physicallyValid: true,
    };
  },
});
