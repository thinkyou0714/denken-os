/**
 * テンプレート: 抵抗の消費電力（理論・multiple_choice 形式）。
 *   P = V²/R = I²·R 〔W〕（直流・純抵抗）
 * 正解はコードで算出。誤答は典型ミス（V/R で電流と混同・V·R 乗算ミス・2乗忘れ）。
 */
import { isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

const VOLT = [10, 20, 50, 100, 200];
const RES = [2, 4, 5, 10, 20, 25, 50];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function fmt(v: number): string {
  return String(Number(v.toFixed(2)));
}

function buildFrom(V: number, R: number): GenerationResult | null {
  if (V <= 0 || R <= 0) return null;
  const P = (V * V) / R; // 正解 [W]
  const noSquare = V / R; // 2乗忘れ（=電流値）
  const mulVR = V * R; // V·R と取り違え
  const half = P / 2; // ½を余計に掛けた（コンデンサ式と混同）

  const vals = [P, noSquare, mulVR, half];
  if (!vals.every((v) => v > 0 && isCleanAnswer(v))) return null;
  const texts = new Set(vals.map(fmt));
  if (texts.size !== 4) return null;

  const answerText = fmt(P);
  const choices = [...texts].sort((a, b) => Number(a) - Number(b));
  const difficulty = V >= 100 ? 2 : 1;

  return {
    difficulty,
    params: {
      voltage: { value: V, unit: "V", realistic_range: [1, 1000] },
      resistance: { value: R, unit: "ohm", realistic_range: [1, 1000] },
    },
    answerValue: P,
    answerUnit: "W",
    answerText,
    choices,
    distractors: [
      { text: fmt(noSquare), reason: "電圧を2乗せず V/R（電流）を答えた" },
      { text: fmt(mulVR), reason: "P=V²/R を V·R と取り違え" },
      { text: fmt(half), reason: "不要な係数½を掛けた（静電エネルギー式と混同）" },
    ],
    likelyWrongChoice: fmt(noSquare),
    facts: { V, R, P },
    defaultStatement: `抵抗${R}Ωに直流電圧${V}Vを加えた。抵抗で消費される電力P〔W〕は?`,
    defaultSolution: ["純抵抗の消費電力 P = V²/R", `P = ${V}² / ${R}`, `P = ${answerText} W`],
    physicallyValid: true,
  };
}

export const resistorPower: Template = {
  topic: "抵抗の消費電力",
  subject: "理論",
  exam: "denken3",
  difficulty: 1,
  paramSpecs: {
    voltage: { unit: "V", realistic_range: [1, 1000] },
    resistance: { unit: "ohm", realistic_range: [1, 1000] },
  },
  generate(rng) {
    return buildFrom(pick(VOLT, rng), pick(RES, rng));
  },
  generateFrom(params) {
    const { voltage, resistance } = params;
    if (voltage === undefined || resistance === undefined) return null;
    return buildFrom(voltage, resistance);
  },
};
