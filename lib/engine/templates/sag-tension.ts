/**
 * テンプレート: 架空電線のたるみ（法規・numeric）。
 *   たるみ  D = w·S² / (8·T)   〔m〕
 *     w=単位長あたり荷重〔N/m〕, S=径間〔m〕, T=水平張力〔N〕
 *   綺麗な D になるよう、目標 D から T を逆算して整数張力の組だけ採用する。
 */
import { ANSWER_EPSILON, formatClean, isCleanAnswer } from "../clean.js";
import { pick } from "./helpers.js";
import type { GenerationResult, Template } from "./types.js";

const W_SET: ReadonlyArray<number> = [10, 15, 20, 30];
const S_SET: ReadonlyArray<number> = [100, 120, 150, 200];
const D_SET: ReadonlyArray<number> = [0.5, 1, 1.5, 2, 2.5, 3, 4, 5];

function buildFrom(w: number, S: number, D: number): GenerationResult | null {
  if (w <= 0 || S <= 0 || D <= 0) return null;
  // 目標 D から張力 T を逆算（T が整数・現実的レンジに入る組のみ採用）。
  const T = (w * S * S) / (8 * D);
  if (Math.abs(T - Math.round(T)) > ANSWER_EPSILON) return null;
  const Tint = Math.round(T);
  if (Tint < 5000 || Tint > 60000) return null;
  if (!isCleanAnswer(D)) return null;
  const answerText = formatClean(D);

  return {
    format: "numeric",
    params: {
      unit_load: { value: w, unit: "N/m", realistic_range: [10, 30] },
      span: { value: S, unit: "m", realistic_range: [100, 200] },
      tension: { value: Tint, unit: "N", realistic_range: [5000, 60000] },
    },
    answerValue: D,
    answerUnit: "m",
    answerText,
    facts: { w, S, T: Tint, D },
    defaultStatement:
      `径間 S=${S}m の架空電線に、単位長あたり荷重 w=${w}N/m が作用している。` +
      `水平張力 T=${Tint}N のとき、電線のたるみ D〔m〕は?`,
    defaultSolution: [`たるみ D=w·S²/(8·T)`, `D=${w}×${S}²/(8×${Tint})`, `D=${answerText}m`],
    physicallyValid: true,
  };
}

export const sagTension: Template = {
  topic: "電線のたるみ",
  subject: "法規",
  exam: "denken2_primary",
  difficulty: 2,
  paramSpecs: {
    unit_load: { unit: "N/m", realistic_range: [10, 30] },
    span: { unit: "m", realistic_range: [100, 200] },
    tension: { unit: "N", realistic_range: [5000, 60000] },
  },
  generate(rng) {
    return buildFrom(pick(W_SET, rng), pick(S_SET, rng), pick(D_SET, rng));
  },
  generateFrom(params) {
    const { unit_load, span, tension } = params;
    if (unit_load === undefined || span === undefined) return null;
    // tension が与えられたら D を直接算出、無ければ D 指定からの逆算は generate 経由。
    if (tension !== undefined) {
      const D = (unit_load * span * span) / (8 * tension);
      return buildFrom(unit_load, span, D);
    }
    return null;
  },
};
