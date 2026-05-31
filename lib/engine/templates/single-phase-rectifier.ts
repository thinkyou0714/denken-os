/**
 * テンプレート: 単相全波整流回路の直流平均電圧。
 *
 * 閉形式（試験で用いる近似）: E_d = 0.9·E   〔V〕
 *   E=交流入力の実効値。（厳密には E_d = 2√2/π·E ≒ 0.900E）
 *
 * 誤答（成立する典型ミス）:
 *   ① 半波と混同      E_d' = 0.45·E
 *   ② 実効値そのまま  E_d' = E
 *   ③ 三相全波と混同  E_d' = 1.35·E
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

const E_SET: ReadonlyArray<number> = [100, 110, 140, 200, 210, 220];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(E: number): GenerationResult | null {
  if (E <= 0) return null;
  const Ed = 0.9 * E; // 正解
  const half = 0.45 * E; // ①
  const rms = E; // ②
  const threePhase = 1.35 * E; // ③

  const vals = [Ed, half, rms, threePhase];
  if (!vals.every((v) => isCleanAnswer(v))) return null;
  const answerText = formatClean(Ed);
  const texts = new Set(vals.map((v) => formatClean(v)));
  if (texts.size !== 4) return null;

  const choices = [...texts].sort((a, b) => Number(a) - Number(b));
  return {
    params: {
      ac_voltage: { value: E, unit: "V", realistic_range: [10, 500] },
    },
    answerValue: Ed,
    answerUnit: "V",
    answerText,
    choices,
    distractors: [
      { text: formatClean(half), reason: "単相半波の係数 0.45 と混同した" },
      { text: formatClean(rms), reason: "交流実効値をそのまま直流平均と扱った" },
      { text: formatClean(threePhase), reason: "三相全波の係数 1.35 と混同した" },
    ],
    likelyWrongChoice: formatClean(half),
    facts: { E, Ed },
    defaultStatement: `交流実効値 ${E}V を単相全波整流したときの直流平均電圧 E_d〔V〕は? ` + `（E_d=0.9E とする）`,
    defaultSolution: [`単相全波: E_d = 0.9·E`, `= 0.9 × ${E}`, `E_d = ${answerText} V`],
    physicallyValid: true,
  };
}

export const singlePhaseRectifier: Template = {
  topic: "単相全波整流回路の平均電圧",
  subject: "機械",
  exam: "denken3",
  difficulty: 2,
  meta: {
    tags: ["機械", "パワーエレクトロニクス", "整流回路"],
    formulas: ["単相全波: E_d = 2√2/π·E ≒ 0.9E", "単相半波: E_d = √2/π·E ≒ 0.45E"],
    learningObjectives: ["整流回路の方式ごとの直流平均電圧の係数を使い分けられる"],
    hints: ["全波は半波の 2 倍", "単相全波の係数は 0.9", "実効値とは別物"],
    prerequisites: ["交流の実効値"],
    relatedTopics: ["昇圧チョッパ", "インバータ", "三相整流回路"],
    estimatedTimeSec: 90,
  },
  paramSpecs: {
    ac_voltage: { unit: "V", realistic_range: [10, 500] },
  },
  generate(rng) {
    return buildFrom(pick(E_SET, rng));
  },
  generateFrom(params) {
    const { ac_voltage } = params;
    if (ac_voltage === undefined) return null;
    return buildFrom(ac_voltage);
  },
};
