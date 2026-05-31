/**
 * テンプレート: 無限長ソレノイド内部の磁界の強さ（アンペアの法則）。
 *
 * 閉形式: H = N·I/L   〔A/m〕   （N=総巻数, L=コイル長, I=電流）
 *   = n·I（n=N/L 単位長あたり巻数）。アンペアの周回積分から導かれる。
 *
 * 誤答（成立する典型ミス）:
 *   ① N·I     コイル長 L で割り忘れ（起磁力 NI のまま）
 *   ② N·I·L   L で割るべきところを掛けた
 *   ③ 2·N·I/L 公式に不要な係数 2 を付けた
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

// [N, L(m), I(A)]。L=1（NI=H）・L=2（2NI/L=NI）は誤答衝突のため除外。
const SETS: ReadonlyArray<readonly [number, number, number]> = [
  [200, 0.5, 2],
  [100, 0.5, 1],
  [300, 0.25, 1],
  [400, 0.5, 2],
  [500, 0.5, 1],
  [200, 4, 4],
  [1000, 5, 5],
  [600, 0.5, 1],
  [250, 0.5, 2],
  [800, 4, 2],
];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(N: number, L: number, I: number): GenerationResult | null {
  if (N <= 0 || L <= 0 || I <= 0) return null;
  const H = (N * I) / L; // 正解
  const noL = N * I; // ① L 忘れ
  const mulL = N * I * L; // ② ×L
  const dbl = (2 * N * I) / L; // ③ 係数2

  const vals = [H, noL, mulL, dbl];
  if (!vals.every((v) => isCleanAnswer(v))) return null;
  const answerText = formatClean(H);
  const texts = new Set(vals.map((v) => formatClean(v)));
  if (texts.size !== 4) return null;

  const choices = [...texts].sort((a, b) => Number(a) - Number(b));
  return {
    params: {
      turns: { value: N, unit: "", realistic_range: [10, 5000] },
      length_m: { value: L, unit: "m", realistic_range: [0.05, 10] },
      current: { value: I, unit: "A", realistic_range: [0.1, 50] },
    },
    answerValue: H,
    answerUnit: "A/m",
    answerText,
    choices,
    distractors: [
      { text: formatClean(noL), reason: "コイル長 L で割り忘れ、起磁力 NI のままにした" },
      { text: formatClean(mulL), reason: "L で割るべきところを掛けた" },
      { text: formatClean(dbl), reason: "公式に不要な係数 2 を付けた（H=NI/L に 2 は不要）" },
    ],
    likelyWrongChoice: formatClean(noL),
    facts: { N, L, I, H },
    defaultStatement:
      `巻数 ${N} 回、長さ ${L}m の無限長ソレノイドに電流 ${I}A を流した。` + `コイル内部の磁界の強さ H〔A/m〕は?`,
    defaultSolution: [`アンペアの法則より H = n·I = (N/L)·I`, `= ${N}×${I}/${L}`, `H = ${answerText} A/m`],
    physicallyValid: true,
  };
}

export const magneticFieldSolenoid: Template = {
  topic: "磁界（アンペアの法則）",
  subject: "理論",
  exam: "denken3",
  difficulty: 2,
  meta: {
    tags: ["理論", "磁気", "アンペアの法則", "ソレノイド"],
    formulas: ["H = N·I/L = n·I 〔A/m〕", "B = μ·H"],
    learningObjectives: ["ソレノイド内部の磁界をアンペアの法則から求められる"],
    hints: ["単位長あたり巻数 n=N/L", "磁界 H と磁束密度 B(=μH) を区別", "単位は A/m"],
    prerequisites: ["電流と磁界の関係"],
    relatedTopics: ["電磁力", "電磁誘導"],
    estimatedTimeSec: 120,
    cognitiveLevel: "apply",
  },
  paramSpecs: {
    turns: { unit: "", realistic_range: [10, 5000] },
    length_m: { unit: "m", realistic_range: [0.05, 10] },
    current: { unit: "A", realistic_range: [0.1, 50] },
  },
  generate(rng) {
    const [N, L, I] = pick(SETS, rng);
    return buildFrom(N, L, I);
  },
  generateFrom(params) {
    const { turns, length_m, current } = params;
    if (turns === undefined || length_m === undefined || current === undefined) return null;
    return buildFrom(turns, length_m, current);
  },
};
