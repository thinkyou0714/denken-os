/**
 * テンプレート: 2 点電荷間に働くクーロン力。
 *
 * 閉形式: F = k · q1 · q2 / r²   （k = 9×10⁹ N·m²/C²）
 *   電荷は µC（×10⁻⁶ C）、距離は m。
 *
 * 誤答（成立する典型ミス）:
 *   ① 距離の二乗忘れ   F' = k·q1·q2/r
 *   ② 電荷を和で計算   F' = k·(q1+q2)/r²  …単位が崩れるので、ここでは
 *                      「積でなく一方だけ」 F' = k·q1/r²
 *   ③ µC 換算もれ      r を 2 倍に取り違え … ではなく距離2倍 F' = k·q1·q2/(2r)²
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

const K = 9e9;
// (q1[µC], q2[µC], r[m]) の母集合。
// r=1 では F·r=F、r=2 では F·r=2F と誤答が衝突するため r≥3 を採用（綺麗な N になる組）。
const SETS: ReadonlyArray<readonly [number, number, number]> = [
  [10, 10, 3],
  [10, 20, 3],
  [20, 20, 3],
  [30, 10, 3],
  [10, 30, 3],
  [10, 60, 3],
  [30, 20, 3],
  [40, 20, 3],
  [20, 30, 3],
  [10, 90, 3],
  [60, 10, 3],
  [50, 10, 5],
  [10, 50, 5],
  [20, 50, 5],
  [50, 20, 5],
];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(q1uC: number, q2uC: number, r: number): GenerationResult | null {
  if (q1uC <= 0 || q2uC <= 0 || r <= 0) return null;
  const q1 = q1uC * 1e-6;
  const q2 = q2uC * 1e-6;
  const F = (K * q1 * q2) / (r * r); // 正解
  const noSquare = F * r; // ① 二乗忘れ（÷r² でなく ÷r）= F·r
  const doubled = F * 2; // ② 一方の電荷を 2 倍に読んだ
  const halved = F / 2; // ③ 係数 1/2 を余計に掛けた

  const distVals = [
    { value: noSquare, reason: "距離の二乗を忘れ r で割った（クーロン力は r² に反比例）" },
    { value: doubled, reason: "電荷の一方を 2 倍に読み違えた" },
    { value: halved, reason: "係数を 1/2 余計に掛けた" },
  ];
  if (![F, ...distVals.map((d) => d.value)].every((v) => isCleanAnswer(v))) return null;

  const answerText = formatClean(F);
  const texts = new Set([answerText, ...distVals.map((d) => formatClean(d.value))]);
  if (texts.size !== 4) return null;

  const choices = [...texts].sort((a, b) => Number(a) - Number(b));
  return {
    params: {
      q1: { value: q1uC, unit: "uC", realistic_range: [1, 100] },
      q2: { value: q2uC, unit: "uC", realistic_range: [1, 100] },
      r: { value: r, unit: "m", realistic_range: [0.1, 10] },
    },
    answerValue: F,
    answerUnit: "N",
    answerText,
    choices,
    distractors: distVals.map((d) => ({ text: formatClean(d.value), reason: d.reason })),
    likelyWrongChoice: formatClean(noSquare),
    facts: { q1uC, q2uC, r, F },
    defaultStatement:
      `真空中で ${q1uC}µC と ${q2uC}µC の点電荷を ${r}m 離して置いた。` +
      `両電荷間に働くクーロン力 F〔N〕は? （k=9×10⁹ N·m²/C²）`,
    defaultSolution: [`F = k·q1·q2/r²`, `= 9×10⁹ × ${q1uC}×10⁻⁶ × ${q2uC}×10⁻⁶ / ${r}²`, `F = ${answerText} N`],
    physicallyValid: true,
  };
}

export const coulombForce: Template = {
  topic: "クーロンの法則（静電力）",
  subject: "理論",
  exam: "denken3",
  difficulty: 2,
  meta: {
    tags: ["理論", "静電気", "クーロンの法則", "電界"],
    formulas: ["F = k·q1·q2/r²", "k = 9×10⁹ N·m²/C²"],
    learningObjectives: ["2 点電荷間の静電力を距離の逆二乗則で計算できる"],
    hints: ["µC は 10⁻⁶ C", "力は距離の二乗に反比例", "k=9×10⁹ を忘れない"],
    prerequisites: ["指数計算"],
    relatedTopics: ["電界の強さ", "コンデンサの静電エネルギー"],
    estimatedTimeSec: 120,
  },
  paramSpecs: {
    q1: { unit: "uC", realistic_range: [1, 100] },
    q2: { unit: "uC", realistic_range: [1, 100] },
    r: { unit: "m", realistic_range: [0.1, 10] },
  },
  generate(rng) {
    const [q1, q2, r] = pick(SETS, rng);
    return buildFrom(q1, q2, r);
  },
  generateFrom(params) {
    const { q1, q2, r } = params;
    if (q1 === undefined || q2 === undefined || r === undefined) return null;
    return buildFrom(q1, q2, r);
  },
};
