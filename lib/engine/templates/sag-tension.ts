/**
 * テンプレート: 架空電線のたるみ（法規・numeric）。
 *   たるみ  D = w·S² / (8·T)   〔m〕
 *     w=単位長あたり荷重〔N/m〕, S=径間〔m〕, T=水平張力〔N〕
 *   綺麗な D になるよう、目標 D から T を逆算して整数張力の組だけ採用する。
 */
import { ANSWER_EPSILON, formatClean, isCleanAnswer } from "../clean.js";
import { defineTemplate, pick } from "./helpers.js";

const W_SET: ReadonlyArray<number> = [10, 15, 20, 30];
const S_SET: ReadonlyArray<number> = [100, 120, 150, 200];
const D_SET: ReadonlyArray<number> = [0.5, 1, 1.5, 2, 2.5, 3, 4, 5];

type Params = {
  unit_load: number;
  span: number;
  tension: number;
};

export const sagTension = defineTemplate<Params>({
  topic: "電線のたるみ",
  subject: "法規",
  exam: "denken2_primary",
  difficulty: 2,
  paramSpecs: {
    unit_load: { unit: "N/m", realistic_range: [10, 30] },
    span: { unit: "m", realistic_range: [100, 200] },
    tension: { unit: "N", realistic_range: [5000, 60000] },
  },
  paramOrder: ["unit_load", "span", "tension"],
  draw(rng) {
    const w = pick(W_SET, rng);
    const S = pick(S_SET, rng);
    const D = pick(D_SET, rng);
    // 目標 D から張力 T を逆算。整数・現実的レンジに入らなければ tension=0 で buildFrom が null を返す。
    const T = (w * S * S) / (8 * D);
    const Tint = Math.abs(T - Math.round(T)) <= ANSWER_EPSILON ? Math.round(T) : 0;
    return { unit_load: w, span: S, tension: Tint };
  },
  buildFrom({ unit_load: w, span: S, tension }) {
    if (w <= 0 || S <= 0 || tension <= 0) return null;
    // tension が与えられた場合は D を直接算出（generateFrom 互換）
    const D = (w * S * S) / (8 * tension);
    if (Math.abs(tension - Math.round(tension)) > ANSWER_EPSILON) return null;
    const Tint = Math.round(tension);
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
  },
});
