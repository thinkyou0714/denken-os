/**
 * テンプレート: RLC 直列回路の合成インピーダンスの大きさ。
 *
 * 閉形式: |Z| = √(R² + (X_L − X_C)²)   〔Ω〕
 *   X = X_L − X_C（誘導性/容量性リアクタンスの差）。
 *   R と |X| をピタゴラス数に取り、|Z| が整数になる draw のみ採用。
 *
 * 誤答（成立する典型ミス）:
 *   ① 単純和        |Z|' = R + |X|
 *   ② X_C 無視      |Z|' = √(R² + X_L²)
 *   ③ 二乗忘れ      |Z|' = √(R + (X_L−X_C))  ではなく R+|X| を /2 …は不自然なので
 *                   リアクタンスを足し算 |Z|' = √(R² + (X_L+X_C)²)
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

// (R, |X|, |Z|) のピタゴラス数。X = XL - XC を後で割り付ける。
const PYTHAG: ReadonlyArray<readonly [number, number, number]> = [
  [3, 4, 5],
  [4, 3, 5],
  [6, 8, 10],
  [8, 6, 10],
  [5, 12, 13],
  [12, 5, 13],
  [8, 15, 17],
  [15, 8, 17],
  [9, 12, 15],
  [12, 9, 15],
  [20, 21, 29],
];
// XC を加えて XL = |X| + XC（誘導性に固定）にするオフセット。
const XC_OFFSETS: ReadonlyArray<number> = [2, 3, 5, 10];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(R: number, XL: number, XC: number): GenerationResult | null {
  if (R <= 0 || XL <= 0 || XC <= 0) return null;
  const X = XL - XC;
  if (X === 0) return null; // 共振点は別テンプレ
  const absX = Math.abs(X);
  const Z = Math.sqrt(R * R + X * X); // 正解（斜辺）
  const sum = R + absX; // ① ベクトルでなく算術和
  const ignoreR = absX; // ② 抵抗 R を無視（リアクタンスだけ）
  const ignoreX = R; // ③ リアクタンスを無視（抵抗だけ）

  const vals = [Z, sum, ignoreR, ignoreX];
  if (!vals.every((v) => isCleanAnswer(v))) return null;
  const answerText = formatClean(Z);
  const texts = new Set(vals.map((v) => formatClean(v)));
  if (texts.size !== 4) return null;

  const distractors = [
    { text: formatClean(sum), reason: "ベクトル和でなく算術和 R+|X| で計算した" },
    { text: formatClean(ignoreR), reason: "抵抗 R を無視しリアクタンスだけで答えた" },
    { text: formatClean(ignoreX), reason: "リアクタンスを無視し抵抗だけで答えた" },
  ];
  const choices = [...texts].sort((a, b) => Number(a) - Number(b));
  return {
    params: {
      R: { value: R, unit: "ohm", realistic_range: [1, 100] },
      XL: { value: XL, unit: "ohm", realistic_range: [1, 100] },
      XC: { value: XC, unit: "ohm", realistic_range: [1, 100] },
    },
    answerValue: Z,
    answerUnit: "ohm",
    answerText,
    choices,
    distractors,
    likelyWrongChoice: formatClean(sum),
    facts: { R, XL, XC, X, Z },
    defaultStatement:
      `RLC 直列回路で R=${R}Ω, 誘導性リアクタンス X_L=${XL}Ω, 容量性リアクタンス X_C=${XC}Ω である。` +
      `合成インピーダンスの大きさ |Z|〔Ω〕は?`,
    defaultSolution: [
      `リアクタンス差 X = X_L − X_C = ${XL} − ${XC} = ${X} Ω`,
      `|Z| = √(R² + X²) = √(${R}² + ${X}²)`,
      `|Z| = ${answerText} Ω`,
    ],
    physicallyValid: true,
  };
}

export const rlcSeriesImpedance: Template = {
  topic: "RLC直列回路のインピーダンス",
  subject: "理論",
  exam: "denken3",
  difficulty: 2,
  meta: {
    tags: ["理論", "交流回路", "インピーダンス", "RLC"],
    formulas: ["|Z| = √(R² + (X_L − X_C)²)", "X_L = ωL", "X_C = 1/(ωC)"],
    learningObjectives: ["RLC 直列回路のインピーダンスをベクトル的に合成できる"],
    hints: ["抵抗とリアクタンスは直交（ベクトル和）", "まず X = X_L − X_C を求める", "|Z| は三平方の定理"],
    prerequisites: ["交流回路の基礎", "ピタゴラスの定理"],
    relatedTopics: ["直列共振", "力率", "三相交流電力"],
    estimatedTimeSec: 120,
  },
  paramSpecs: {
    R: { unit: "ohm", realistic_range: [1, 100] },
    XL: { unit: "ohm", realistic_range: [1, 100] },
    XC: { unit: "ohm", realistic_range: [1, 100] },
  },
  generate(rng) {
    const [R, absX] = pick(PYTHAG, rng);
    const XC = pick(XC_OFFSETS, rng);
    return buildFrom(R, absX + XC, XC);
  },
  generateFrom(params) {
    const { R, XL, XC } = params;
    if (R === undefined || XL === undefined || XC === undefined) return null;
    return buildFrom(R, XL, XC);
  },
};
