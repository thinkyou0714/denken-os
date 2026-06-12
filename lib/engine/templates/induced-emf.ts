/**
 * テンプレート: 電磁誘導起電力（理論・numeric）。
 *   磁束密度 B〔T〕の磁界中を、長さ l〔m〕の導体が磁界と直角方向に速度 v〔m/s〕で動くとき:
 *     e = B·l·v   〔V〕
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { pick } from "./helpers.js";
import type { GenerationResult, Template } from "./types.js";

const B_SET: ReadonlyArray<number> = [0.2, 0.4, 0.5, 0.8, 1, 1.2, 1.5, 2];
const L_SET: ReadonlyArray<number> = [0.2, 0.25, 0.4, 0.5, 0.8, 1];
const V_SET: ReadonlyArray<number> = [2, 4, 5, 8, 10, 12, 20];

function buildFrom(b: number, len: number, v: number): GenerationResult | null {
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
}

export const inducedEmf: Template = {
  topic: "電磁誘導起電力",
  subject: "理論",
  exam: "denken2_primary",
  difficulty: 2,
  paramSpecs: {
    flux_density: { unit: "T", realistic_range: [0.1, 2.5] },
    length: { unit: "m", realistic_range: [0.1, 2] },
    velocity: { unit: "m/s", realistic_range: [1, 30] },
  },
  generate(rng) {
    return buildFrom(pick(B_SET, rng), pick(L_SET, rng), pick(V_SET, rng));
  },
  generateFrom(params) {
    const { flux_density, length, velocity } = params;
    if (flux_density === undefined || length === undefined || velocity === undefined) return null;
    return buildFrom(flux_density, length, velocity);
  },
};
