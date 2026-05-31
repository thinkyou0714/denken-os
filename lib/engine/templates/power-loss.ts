/**
 * テンプレート: 三相3線式線路の電力損失。
 *
 * 閉形式: P_loss = 3·I²·R   〔W〕   （3 線分。1 線の抵抗 R、線電流 I）
 *
 * 誤答（成立する典型ミス）:
 *   ① I²·R    係数 3（3 線分）を忘れ、1 線分だけにした
 *   ② 3·I·R   電流の二乗を忘れた
 *   ③ 2·I²·R  単相2線式の係数 2 を使った
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

// [I(A), R(Ω/線)]。3I²R, I²R, 3IR, 2I²R が綺麗かつ相異なる組。
const SETS: ReadonlyArray<readonly [number, number]> = [
  [10, 2],
  [5, 2],
  [20, 1],
  [10, 0.5],
  [8, 2],
  [4, 3],
  [10, 1],
  [15, 2],
  [20, 0.5],
  [6, 5],
];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(I: number, R: number): GenerationResult | null {
  if (I <= 0 || R <= 0) return null;
  const loss = 3 * I * I * R; // 正解
  const oneLine = I * I * R; // ①
  const noSquare = 3 * I * R; // ②
  const single = 2 * I * I * R; // ③

  const vals = [loss, oneLine, noSquare, single];
  if (!vals.every((v) => isCleanAnswer(v))) return null;
  const answerText = formatClean(loss);
  const texts = new Set(vals.map((v) => formatClean(v)));
  if (texts.size !== 4) return null;

  const choices = [...texts].sort((a, b) => Number(a) - Number(b));
  return {
    params: {
      current: { value: I, unit: "A", realistic_range: [1, 200] },
      resistance: { value: R, unit: "ohm", realistic_range: [0.05, 50] },
    },
    answerValue: loss,
    answerUnit: "W",
    answerText,
    choices,
    distractors: [
      { text: formatClean(oneLine), reason: "係数 3（3 線分）を忘れ、1 線分だけにした" },
      { text: formatClean(noSquare), reason: "電流の二乗を忘れた（P=I²R）" },
      { text: formatClean(single), reason: "単相2線式の係数 2 を使った（三相3線は 3）" },
    ],
    likelyWrongChoice: formatClean(oneLine),
    facts: { I, R, loss },
    defaultStatement:
      `三相3線式線路で、1 線あたりの抵抗が ${R}Ω、線電流が ${I}A 流れている。` + `この線路で生じる全電力損失 P〔W〕は?`,
    defaultSolution: [`三相3線式の損失は 3 線分 P = 3·I²·R`, `= 3 × ${I}² × ${R}`, `P = ${answerText} W`],
    physicallyValid: true,
  };
}

export const powerLoss: Template = {
  topic: "電力損失",
  subject: "電力",
  exam: "denken3",
  difficulty: 2,
  meta: {
    tags: ["電力", "送配電", "電力損失", "三相"],
    formulas: ["三相3線 P = 3·I²·R", "単相2線 P = 2·I²·R"],
    learningObjectives: ["線路の電力損失を線数と電流の二乗から正しく求められる"],
    hints: ["損失は電流の二乗に比例", "三相3線は 3 線分", "力率改善で電流↓→損失↓"],
    prerequisites: ["オームの法則", "三相交流電力"],
    relatedTopics: ["三相線路の電圧降下", "力率改善用コンデンサ容量"],
    estimatedTimeSec: 90,
    cognitiveLevel: "apply",
  },
  paramSpecs: {
    current: { unit: "A", realistic_range: [1, 200] },
    resistance: { unit: "ohm", realistic_range: [0.05, 50] },
  },
  generate(rng) {
    const [I, R] = pick(SETS, rng);
    return buildFrom(I, R);
  },
  generateFrom(params) {
    const { current, resistance } = params;
    if (current === undefined || resistance === undefined) return null;
    return buildFrom(current, resistance);
  },
};
