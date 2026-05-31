/**
 * テンプレート: ブロック線図の縦続（直列）結合の合成伝達関数（DC利得）。
 *
 * 閉形式: G = G1 · G2   （縦続接続は『積』）
 *
 * 誤答（成立する典型ミス）:
 *   ① G1 + G2  並列結合（加算点）と混同し和をとった
 *   ② G1 / G2  縦続接続を割り算した
 *   ③ G1 − G2  差をとった
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

// [G1, G2]。G1>G2 かつ G1/G2 が綺麗。積/和/商/差が相異なる組。
const SETS: ReadonlyArray<readonly [number, number]> = [
  [10, 5],
  [8, 4],
  [6, 2],
  [10, 2],
  [9, 3],
  [8, 2],
  [12, 4],
  [10, 4],
  [6, 3],
  [15, 5],
];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(G1: number, G2: number): GenerationResult | null {
  if (G1 <= 0 || G2 <= 0 || G1 <= G2) return null;
  const product = G1 * G2; // 正解
  const sum = G1 + G2; // ①
  const quotient = G1 / G2; // ②
  const diff = G1 - G2; // ③

  const vals = [product, sum, quotient, diff];
  if (!vals.every((v) => isCleanAnswer(v) && v > 0)) return null;
  const answerText = formatClean(product);
  const texts = new Set(vals.map((v) => formatClean(v)));
  if (texts.size !== 4) return null;

  const choices = [...texts].sort((a, b) => Number(a) - Number(b));
  return {
    params: {
      gain1: { value: G1, unit: "", realistic_range: [1, 100] },
      gain2: { value: G2, unit: "", realistic_range: [1, 100] },
    },
    answerValue: product,
    answerUnit: "",
    answerText,
    choices,
    distractors: [
      { text: formatClean(sum), reason: "並列結合（加算点）と混同し和をとった（縦続は積）" },
      { text: formatClean(quotient), reason: "縦続接続を割り算した（正しくは積）" },
      { text: formatClean(diff), reason: "差をとった（縦続は積）" },
    ],
    likelyWrongChoice: formatClean(sum),
    facts: { G1, G2, product },
    defaultStatement:
      `ブロック線図で、利得 ${G1} の要素と利得 ${G2} の要素が縦続（直列）に接続されている。` + `全体の合成利得は?`,
    defaultSolution: [`縦続接続の合成は各利得の積 G = G1·G2`, `= ${G1} × ${G2}`, `G = ${answerText}`],
    physicallyValid: true,
  };
}

export const transferFunction: Template = {
  topic: "自動制御（伝達関数・ブロック線図）",
  subject: "機械",
  exam: "denken3",
  difficulty: 2,
  meta: {
    tags: ["機械", "自動制御", "伝達関数", "ブロック線図"],
    formulas: ["縦続: G=G1·G2", "並列: G=G1+G2", "フィードバック: G/(1+GH)"],
    learningObjectives: ["ブロック線図の結合則（縦続=積・並列=和）で合成伝達関数を求められる"],
    hints: ["縦続（直列）は掛ける", "並列（加算点）は足す", "帰還は G/(1±GH)"],
    prerequisites: ["伝達関数の定義"],
    relatedTopics: ["自動制御の安定判別", "同期発電機の出力・短絡比"],
    estimatedTimeSec: 90,
    cognitiveLevel: "apply",
  },
  paramSpecs: {
    gain1: { unit: "", realistic_range: [1, 100] },
    gain2: { unit: "", realistic_range: [1, 100] },
  },
  generate(rng) {
    const [G1, G2] = pick(SETS, rng);
    return buildFrom(G1, G2);
  },
  generateFrom(params) {
    const { gain1, gain2 } = params;
    if (gain1 === undefined || gain2 === undefined) return null;
    return buildFrom(gain1, gain2);
  },
};
