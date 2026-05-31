/**
 * テンプレート: 架空電線のたるみ（弛度）。
 *
 * 閉形式: D = W·S² / (8·T)   〔m〕
 *   W=電線の単位長あたり荷重[N/m], S=径間[m], T=水平張力[N]。
 *
 * numeric 形式（選択肢なし・許容誤差つき）。
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

const W_SET: ReadonlyArray<number> = [10, 16, 20, 24, 30, 40];
const S_SET: ReadonlyArray<number> = [100, 120, 150, 200, 250, 300];
const T_SET: ReadonlyArray<number> = [10000, 12000, 15000, 20000, 25000, 30000];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(W: number, S: number, T: number): GenerationResult | null {
  if (W <= 0 || S <= 0 || T <= 0) return null;
  const D = (W * S * S) / (8 * T); // 正解
  if (D <= 0 || D > S / 4 || !isCleanAnswer(D)) return null; // 弛度が径間に対し過大は非現実的
  const answerText = formatClean(D);

  return {
    format: "numeric",
    params: {
      load: { value: W, unit: "N/m", realistic_range: [5, 60] },
      span: { value: S, unit: "m", realistic_range: [50, 400] },
      tension: { value: T, unit: "N", realistic_range: [5000, 50000] },
    },
    answerValue: D,
    answerUnit: "m",
    answerText,
    facts: { W, S, T, D },
    numericTolerance: 0.05,
    defaultStatement:
      `径間 ${S}m、電線の単位長あたり荷重 ${W}N/m、水平張力 ${T}N の架空電線がある。` +
      `たるみ（弛度）D〔m〕を求めよ。（D=WS²/8T）`,
    defaultSolution: [`D = W·S²/(8·T)`, `= ${W}×${S}²/(8×${T})`, `D = ${answerText} m`],
    physicallyValid: true,
  };
}

export const sag: Template = {
  topic: "架空電線のたるみ（弛度）",
  subject: "電力",
  exam: "denken3",
  difficulty: 2,
  meta: {
    tags: ["電力", "送電", "架空電線", "弛度", "機械的強度"],
    formulas: ["D = WS²/(8T)", "電線実長 L ≒ S + 8D²/(3S)"],
    learningObjectives: ["荷重・径間・張力からたるみを計算でき、張力との反比例関係を説明できる"],
    hints: ["たるみは径間の二乗に比例", "張力に反比例", "分母の 8 を忘れない"],
    prerequisites: ["力のつり合い"],
    relatedTopics: ["電線の実長", "風圧荷重", "支線の張力"],
    estimatedTimeSec: 150,
  },
  paramSpecs: {
    load: { unit: "N/m", realistic_range: [5, 60] },
    span: { unit: "m", realistic_range: [50, 400] },
    tension: { unit: "N", realistic_range: [5000, 50000] },
  },
  generate(rng) {
    const W = pick(W_SET, rng);
    const S = pick(S_SET, rng);
    const T = pick(T_SET, rng);
    return buildFrom(W, S, T);
  },
  generateFrom(params) {
    const { load, span, tension } = params;
    if (load === undefined || span === undefined || tension === undefined) return null;
    return buildFrom(load, span, tension);
  },
};
