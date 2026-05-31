/**
 * テンプレート: 三相3線式線路の電圧降下（線間）。
 *
 * 閉形式: v = √3·I·(R·cosθ + X·sinθ)   〔V〕   （√3≒1.73 を用いる）
 *   遅れ力率 cosθ=0.8（sinθ=0.6）で固定。
 *
 * 誤答（成立する典型ミス）:
 *   ① 2·I·(R·cosθ+X·sinθ)  単相2線式の係数 2 を使った（三相は √3）
 *   ② I·(R·cosθ+X·sinθ)     √3（線間換算）を掛け忘れた
 *   ③ √3·I·(R·sinθ+X·cosθ)  R と X（または cosθ,sinθ）を取り違えた
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

const SQRT3 = 1.73;
const COS = 0.8;
const SIN = 0.6;
const round2 = (x: number) => Math.round(x * 100) / 100;

// [I(A), R(Ω/線), X(Ω/線)]。cosθ=0.8 固定、R≠X（取り違え誤答を成立させる）。
const SETS: ReadonlyArray<readonly [number, number, number]> = [
  [10, 2, 1],
  [10, 1, 2],
  [10, 3, 1],
  [10, 1, 3],
  [10, 3, 2],
  [10, 2, 3],
  [10, 4, 1],
  [10, 4, 2],
  [5, 2, 1],
  [20, 1, 2],
];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(I: number, R: number, X: number): GenerationResult | null {
  if (I <= 0 || R <= 0 || X <= 0 || R === X) return null;
  const base = I * (R * COS + X * SIN);
  const baseSwap = I * (R * SIN + X * COS);
  const v = round2(SQRT3 * base); // 正解
  const single = round2(2 * base); // ①
  const noSqrt = round2(base); // ②
  const swapped = round2(SQRT3 * baseSwap); // ③

  const vals = [v, single, noSqrt, swapped];
  if (!vals.every((x) => isCleanAnswer(x) && x > 0)) return null;
  const answerText = formatClean(v);
  const texts = new Set(vals.map((x) => formatClean(x)));
  if (texts.size !== 4) return null;

  const choices = [...texts].sort((a, b) => Number(a) - Number(b));
  return {
    params: {
      current: { value: I, unit: "A", realistic_range: [1, 200] },
      R: { value: R, unit: "ohm", realistic_range: [0.1, 20] },
      X: { value: X, unit: "ohm", realistic_range: [0.1, 20] },
    },
    answerValue: v,
    answerUnit: "V",
    answerText,
    choices,
    distractors: [
      { text: formatClean(single), reason: "単相2線式の係数 2 を使った（三相3線式は √3）" },
      { text: formatClean(noSqrt), reason: "√3（線間換算）を掛け忘れた" },
      { text: formatClean(swapped), reason: "R と X（cosθ と sinθ）を取り違えた" },
    ],
    likelyWrongChoice: formatClean(single),
    facts: { I, R, X, v },
    defaultStatement:
      `三相3線式線路で、1 線あたり抵抗 ${R}Ω・リアクタンス ${X}Ω、線電流 ${I}A、遅れ力率 cosθ=0.8 である。` +
      `線間の電圧降下 v〔V〕は? （√3≒1.73）`,
    defaultSolution: [`v = √3·I·(R·cosθ + X·sinθ)`, `= 1.73 × ${I} × (${R}×0.8 + ${X}×0.6)`, `v = ${answerText} V`],
    physicallyValid: true,
  };
}

export const threePhaseVoltageDrop: Template = {
  topic: "三相線路の電圧降下",
  subject: "電力",
  exam: "denken3",
  difficulty: 3,
  meta: {
    tags: ["電力", "送配電", "電圧降下", "三相"],
    formulas: ["v = √3·I·(R·cosθ + X·sinθ) 〔V〕（三相3線）", "単相2線は v = 2·I·(R·cosθ + X·sinθ)"],
    learningObjectives: ["三相3線式の線間電圧降下を √3 係数で正しく計算できる"],
    hints: ["三相3線は √3、単相2線は 2", "力率角 θ で R は cosθ、X は sinθ", "√3≒1.73"],
    prerequisites: ["三相交流電力", "単相線路の電圧降下"],
    relatedTopics: ["単相線路の電圧降下", "電力損失"],
    estimatedTimeSec: 150,
    cognitiveLevel: "apply",
  },
  paramSpecs: {
    current: { unit: "A", realistic_range: [1, 200] },
    R: { unit: "ohm", realistic_range: [0.1, 20] },
    X: { unit: "ohm", realistic_range: [0.1, 20] },
  },
  generate(rng) {
    const [I, R, X] = pick(SETS, rng);
    return buildFrom(I, R, X);
  },
  generateFrom(params) {
    const { current, R, X } = params;
    if (current === undefined || R === undefined || X === undefined) return null;
    return buildFrom(current, R, X);
  },
};
