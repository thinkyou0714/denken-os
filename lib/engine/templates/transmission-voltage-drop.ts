/**
 * テンプレート: 単相2線式線路の電圧降下（近似式）。
 *
 * 閉形式: v = 2·I·(R·cosθ + X·sinθ)   〔V〕
 *   I=線電流, R,X=1線あたりの抵抗・リアクタンス, 力率 cosθ=0.8(sinθ=0.6) 固定。
 *
 * 誤答（成立する典型ミス）:
 *   ① 係数 2 の忘れ（片道）   v' = I·(R·cosθ + X·sinθ)
 *   ② リアクタンス分の無視     v' = 2·I·R·cosθ
 *   ③ 力率を 1 とみなす        v' = 2·I·R
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

const COS = 0.8;
const SIN = 0.6;
const I_SET: ReadonlyArray<number> = [10, 20, 25, 50, 100];
const R_SET: ReadonlyArray<number> = [0.5, 1, 1.5, 2, 2.5];
const X_SET: ReadonlyArray<number> = [0.5, 1, 1.5, 2, 3];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(I: number, R: number, X: number): GenerationResult | null {
  if (I <= 0 || R <= 0 || X <= 0) return null;
  const v = 2 * I * (R * COS + X * SIN); // 正解
  const oneWay = I * (R * COS + X * SIN); // ①
  const noX = 2 * I * R * COS; // ②
  const pfOne = 2 * I * R; // ③

  const vals = [v, oneWay, noX, pfOne];
  if (!vals.every((q) => isCleanAnswer(q))) return null;
  const answerText = formatClean(v);
  const texts = new Set(vals.map((q) => formatClean(q)));
  if (texts.size !== 4) return null;

  const choices = [...texts].sort((a, b) => Number(a) - Number(b));
  return {
    params: {
      current: { value: I, unit: "A", realistic_range: [1, 200] },
      R: { value: R, unit: "ohm", realistic_range: [0.1, 10] },
      X: { value: X, unit: "ohm", realistic_range: [0.1, 10] },
    },
    answerValue: v,
    answerUnit: "V",
    answerText,
    choices,
    distractors: [
      { text: formatClean(oneWay), reason: "往復2線分の係数 2 を忘れた（片道で計算）" },
      { text: formatClean(noX), reason: "リアクタンス分 X·sinθ を無視した" },
      { text: formatClean(pfOne), reason: "力率を 1 とみなし抵抗分のみで計算した" },
    ],
    likelyWrongChoice: formatClean(oneWay),
    facts: { I, R, X, cos: COS, sin: SIN, v },
    defaultStatement:
      `単相2線式線路で線電流 ${I}A、1線あたり R=${R}Ω, X=${X}Ω、負荷力率 0.8(遅れ) である。` +
      `線路の電圧降下 v〔V〕は? （近似式 v=2I(Rcosθ+Xsinθ)）`,
    defaultSolution: [
      `cosθ=0.8, sinθ=0.6`,
      `v = 2·I·(R·cosθ + X·sinθ) = 2×${I}×(${R}×0.8 + ${X}×0.6)`,
      `v = ${answerText} V`,
    ],
    physicallyValid: true,
  };
}

export const transmissionVoltageDrop: Template = {
  topic: "単相線路の電圧降下",
  subject: "電力",
  exam: "denken3",
  difficulty: 3,
  meta: {
    tags: ["電力", "送配電", "電圧降下", "力率"],
    formulas: ["v = 2I(Rcosθ + Xsinθ)（単相2線）", "v = √3·I(Rcosθ + Xsinθ)（三相3線）"],
    learningObjectives: ["線路定数と力率から電圧降下を近似計算でき、相数による係数の違いを説明できる"],
    hints: ["単相2線は往復で係数 2", "抵抗分は cosθ、リアクタンス分は sinθ", "三相は √3"],
    prerequisites: ["三相交流電力", "力率"],
    relatedTopics: ["三相線路の電圧降下", "電力損失"],
    estimatedTimeSec: 180,
  },
  paramSpecs: {
    current: { unit: "A", realistic_range: [1, 200] },
    R: { unit: "ohm", realistic_range: [0.1, 10] },
    X: { unit: "ohm", realistic_range: [0.1, 10] },
  },
  generate(rng) {
    const I = pick(I_SET, rng);
    const R = pick(R_SET, rng);
    const X = pick(X_SET, rng);
    return buildFrom(I, R, X);
  },
  generateFrom(params) {
    const { current, R, X } = params;
    if (current === undefined || R === undefined || X === undefined) return null;
    return buildFrom(current, R, X);
  },
};
