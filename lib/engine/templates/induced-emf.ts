/**
 * テンプレート: 電磁誘導起電力（理論・numeric）。
 *   磁束密度 B〔T〕の磁界中を、長さ l〔m〕の導体が磁界と直角方向に速度 v〔m/s〕で動くとき:
 *     e = B·l·v   〔V〕
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { defineTemplate, pick } from "./helpers.js";

const B_SET: ReadonlyArray<number> = [0.2, 0.4, 0.5, 0.8, 1, 1.2, 1.5, 2];
const L_SET: ReadonlyArray<number> = [0.2, 0.25, 0.4, 0.5, 0.8, 1];
const V_SET: ReadonlyArray<number> = [2, 4, 5, 8, 10, 12, 20];

type Params = {
  flux_density: number;
  length: number;
  velocity: number;
};

export const inducedEmf = defineTemplate<Params>({
  topic: "電磁誘導起電力",
  subject: "理論",
  exam: "denken2_primary",
  difficulty: 2,
  pastExam: { area: "電磁気", frequency: "high", years: [2007, 2012, 2018, 2023] },
  paramSpecs: {
    flux_density: { unit: "T", realistic_range: [0.1, 2.5] },
    length: { unit: "m", realistic_range: [0.1, 2] },
    velocity: { unit: "m/s", realistic_range: [1, 30] },
  },
  paramOrder: ["flux_density", "length", "velocity"],
  draw(rng) {
    return {
      flux_density: pick(B_SET, rng),
      length: pick(L_SET, rng),
      velocity: pick(V_SET, rng),
    };
  },
  buildFrom({ flux_density: b, length: len, velocity: v }) {
    if (b <= 0 || len <= 0 || v <= 0) return null;
    const e = b * len * v;
    if (!isCleanAnswer(e)) return null;
    const answerText = formatClean(e);
    return {
      format: "numeric",
      params: {
        flux_density: { value: b, unit: "T", realistic_range: [0.1, 2.5] },
        length: { value: len, unit: "m", realistic_range: [0.1, 2] },
        velocity: { value: v, unit: "m/s", realistic_range: [1, 30] },
      },
      answerValue: e,
      answerUnit: "V",
      answerText,
      facts: { b, len, v, e },
      defaultStatement:
        `磁束密度 ${formatClean(b)}T の一様な磁界中で、長さ ${formatClean(len)}m の直線導体を磁界と直角方向に` +
        `速度 ${formatClean(v)}m/s で動かすとき、導体に誘導される起電力〔V〕は?`,
      defaultSolution: [
        `e=B·l·v（フレミング右手の法則）`,
        `=${formatClean(b)}×${formatClean(len)}×${formatClean(v)}`,
        `=${answerText}V`,
      ],
      physicallyValid: true,
    };
  },
});
