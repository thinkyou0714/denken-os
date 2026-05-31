/**
 * テンプレート: 磁界中の電流が受ける力（電磁力, フレミング左手）。
 *
 * 閉形式: F = B·I·L   〔N〕   （磁束に直角な導体。B=磁束密度, I=電流, L=導体長）
 *
 * 誤答（成立する典型ミス）:
 *   ① B·I   導体長 L を掛け忘れた
 *   ② I·L   磁束密度 B を掛け忘れた
 *   ③ B·L   電流 I を掛け忘れた
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

// [B(T), I(A), L(m)]。B=1,I=1,L=1 は誤答が正解と衝突するため除外。
const SETS: ReadonlyArray<readonly [number, number, number]> = [
  [0.5, 10, 2],
  [0.4, 10, 2],
  [0.5, 20, 2],
  [0.8, 5, 2],
  [2, 5, 0.5],
  [1.2, 10, 0.5],
  [0.5, 4, 3],
  [0.2, 10, 3],
  [2, 4, 0.5],
  [0.5, 8, 3],
];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(B: number, I: number, L: number): GenerationResult | null {
  if (B <= 0 || I <= 0 || L <= 0) return null;
  const F = B * I * L; // 正解
  const noL = B * I; // ①
  const noB = I * L; // ②
  const noI = B * L; // ③

  const vals = [F, noL, noB, noI];
  if (!vals.every((v) => isCleanAnswer(v))) return null;
  const answerText = formatClean(F);
  const texts = new Set(vals.map((v) => formatClean(v)));
  if (texts.size !== 4) return null;

  const choices = [...texts].sort((a, b) => Number(a) - Number(b));
  return {
    params: {
      flux_density: { value: B, unit: "T", realistic_range: [0.05, 3] },
      current: { value: I, unit: "A", realistic_range: [0.1, 100] },
      conductor_length: { value: L, unit: "m", realistic_range: [0.05, 10] },
    },
    answerValue: F,
    answerUnit: "N",
    answerText,
    choices,
    distractors: [
      { text: formatClean(noL), reason: "導体長 L を掛け忘れた" },
      { text: formatClean(noB), reason: "磁束密度 B を掛け忘れた" },
      { text: formatClean(noI), reason: "電流 I を掛け忘れた" },
    ],
    likelyWrongChoice: formatClean(noL),
    facts: { B, I, L, F },
    defaultStatement:
      `磁束密度 ${B}T の一様磁界中に、磁界と直角に置かれた長さ ${L}m の導体に電流 ${I}A を流した。` +
      `導体が受ける力 F〔N〕は?`,
    defaultSolution: [`F = B·I·L`, `= ${B} × ${I} × ${L}`, `F = ${answerText} N`],
    physicallyValid: true,
  };
}

export const electromagneticForce: Template = {
  topic: "電磁力",
  subject: "理論",
  exam: "denken3",
  difficulty: 2,
  meta: {
    tags: ["理論", "磁気", "電磁力", "フレミング左手の法則"],
    formulas: ["F = B·I·L 〔N〕", "F = B·I·L·sinθ（一般）"],
    learningObjectives: ["磁界中の通電導体が受ける力の大きさと向きを求められる"],
    hints: ["3 量の積 B·I·L", "向きはフレミング左手の法則", "磁界と直角なら sinθ=1"],
    prerequisites: ["磁界（アンペアの法則）"],
    relatedTopics: ["電磁誘導", "直流電動機の逆起電力"],
    estimatedTimeSec: 90,
    cognitiveLevel: "apply",
  },
  paramSpecs: {
    flux_density: { unit: "T", realistic_range: [0.05, 3] },
    current: { unit: "A", realistic_range: [0.1, 100] },
    conductor_length: { unit: "m", realistic_range: [0.05, 10] },
  },
  generate(rng) {
    const [B, I, L] = pick(SETS, rng);
    return buildFrom(B, I, L);
  },
  generateFrom(params) {
    const { flux_density, current, conductor_length } = params;
    if (flux_density === undefined || current === undefined || conductor_length === undefined) return null;
    return buildFrom(flux_density, current, conductor_length);
  },
};
