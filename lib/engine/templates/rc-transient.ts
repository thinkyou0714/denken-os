/**
 * テンプレート: RC 過渡現象（時定数 τ における充電電圧）。
 *
 * 閉形式: コンデンサ充電 v(t)=E(1−e^(−t/τ))。t=τ で v=E(1−e⁻¹)≒0.63E 〔V〕。
 *   （試験では 63% で扱う。理解を問う設問。）
 *
 * 誤答（成立する典型ミス）:
 *   ① 0.37E   残り 37%（=放電側）と取り違えた
 *   ② 0.5E    時定数で半分(50%)に達すると誤認した
 *   ③ E       十分時間後の定常値(100%)と混同した
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

// t=τ での充電率（試験慣用の 63%）。
const CHARGE = 0.63;
const REMAIN = 0.37;
const VOLTAGES: ReadonlyArray<number> = [20, 50, 100, 150, 200, 300, 400, 1000];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(E: number): GenerationResult | null {
  if (E <= 0) return null;
  const v = CHARGE * E; // 正解（t=τ で約63%）
  const remain = REMAIN * E; // ①
  const half = 0.5 * E; // ②
  const full = E; // ③

  const vals = [v, remain, half, full];
  if (!vals.every((x) => isCleanAnswer(x))) return null;
  const answerText = formatClean(v);
  const texts = new Set(vals.map((x) => formatClean(x)));
  if (texts.size !== 4) return null;

  const choices = [...texts].sort((a, b) => Number(a) - Number(b));
  return {
    params: {
      source_voltage: { value: E, unit: "V", realistic_range: [1, 1000] },
    },
    answerValue: v,
    answerUnit: "V",
    answerText,
    choices,
    distractors: [
      { text: formatClean(remain), reason: "時定数 τ で充電は約63%。残り37%（放電側）と取り違えた" },
      { text: formatClean(half), reason: "時定数で半分(50%)に達すると誤認した" },
      { text: formatClean(full), reason: "十分時間後の定常値(100%)と混同した" },
    ],
    likelyWrongChoice: formatClean(remain),
    facts: { E, v },
    defaultStatement:
      `直流電圧 ${E}V を、抵抗 R とコンデンサ C の直列回路に印加して充電する。` +
      `時定数 τ=RC だけ経過した時刻におけるコンデンサ端子電圧 v〔V〕に最も近いのは? （e⁻¹≒0.37）`,
    defaultSolution: [`v(t) = E(1 − e^(−t/τ))`, `t=τ で v = E(1 − e⁻¹) ≒ E×0.63 = ${E}×0.63`, `v ≒ ${answerText} V`],
    physicallyValid: true,
  };
}

export const rcTransient: Template = {
  topic: "RC・RL過渡現象",
  subject: "理論",
  exam: "denken3",
  difficulty: 2,
  meta: {
    tags: ["理論", "過渡現象", "時定数", "RC回路"],
    formulas: ["v(t)=E(1−e^(−t/τ))", "τ=RC（RC回路）", "τ=L/R（RL回路）"],
    learningObjectives: ["時定数の物理的意味（63%到達）を理解し充電電圧を見積もれる"],
    hints: ["1τ で約63%、5τ でほぼ定常", "充電は (1−e⁻¹)、放電は e⁻¹(=37%)", "e⁻¹≒0.37"],
    prerequisites: ["コンデンサの静電エネルギー", "指数関数"],
    relatedTopics: ["直列共振", "コンデンサの静電エネルギー"],
    estimatedTimeSec: 120,
    cognitiveLevel: "understand",
  },
  paramSpecs: {
    source_voltage: { unit: "V", realistic_range: [1, 1000] },
  },
  generate(rng) {
    return buildFrom(pick(VOLTAGES, rng));
  },
  generateFrom(params) {
    const { source_voltage } = params;
    if (source_voltage === undefined) return null;
    return buildFrom(source_voltage);
  },
};
