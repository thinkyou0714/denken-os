/**
 * テンプレート: 単相2線式配電線の電圧降下（電力・multiple_choice 形式）。
 *   vd = 2·I·(R·cosθ + X·sinθ)   〔V〕
 *   （往復2線ぶんで係数2。三相3線式は√3で割り切れない組が多いため、
 *     答えが常に綺麗になる単相2線式を採用する）
 * 正解はコードで算出。誤答は典型ミス（係数2忘れ・リアクタンス項落とし・符号ミス）。
 */
import { isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

const CURRENT = [5, 10, 15, 20, 25]; // 負荷電流 [A]
const R_SET = [0.1, 0.2, 0.3, 0.5, 1]; // 1線あたり抵抗 [Ω]
const X_SET = [0.1, 0.2, 0.3, 0.5, 1]; // 1線あたりリアクタンス [Ω]
// cosθ と sinθ がともに綺麗になる遅れ力率。
const PF: ReadonlyArray<readonly [number, number]> = [
  [0.8, 0.6],
  [0.6, 0.8],
  [1.0, 0.0],
];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function fmt(v: number): string {
  return String(Number(v.toFixed(2)));
}

function buildFrom(I: number, R: number, X: number, cos: number, sin: number): GenerationResult | null {
  if (I <= 0 || R <= 0 || X < 0 || cos <= 0 || cos > 1) return null;

  const vd = 2 * I * (R * cos + X * sin); // 正解 [V]
  const noFactor2 = I * (R * cos + X * sin); // 係数2を忘れた（片道のみ）
  const dropReactance = 2 * I * R * cos; // リアクタンス項を落とした
  const signError = 2 * I * (R * cos - X * sin); // 進み/遅れを取り違えた符号ミス

  const vals = [vd, noFactor2, dropReactance, signError];
  if (!vals.every((v) => v > 0 && isCleanAnswer(v))) return null;
  const texts = new Set(vals.map(fmt));
  if (texts.size !== 4) return null; // 4つが相互に重複しない draw のみ採用

  const answerText = fmt(vd);
  const choices = [...texts].sort((a, b) => Number(a) - Number(b));

  // 力率1（リアクタンスが効かない素直なケース）は易しめ。
  const difficulty = sin === 0 ? 2 : 3;

  return {
    difficulty,
    params: {
      current: { value: I, unit: "A", realistic_range: [1, 100] },
      resistance: { value: R, unit: "ohm", realistic_range: [0.01, 5] },
      reactance: { value: X, unit: "ohm", realistic_range: [0.01, 5] },
      power_factor: { value: cos, unit: "", realistic_range: [0.5, 1] },
    },
    answerValue: vd,
    answerUnit: "V",
    answerText,
    choices,
    distractors: [
      { text: fmt(noFactor2), reason: "往復2線ぶんの係数2を忘れ片道だけで計算" },
      { text: fmt(dropReactance), reason: "リアクタンス降下 X·sinθ の項を落とした" },
      { text: fmt(signError), reason: "遅れ力率なのに符号を取り違え X·sinθ を減算" },
    ],
    likelyWrongChoice: fmt(noFactor2),
    facts: { I, R, X, cos, sin, vd },
    defaultStatement:
      `単相2線式配電線（1線あたり抵抗R=${R}Ω、リアクタンスX=${X}Ω）に、` +
      `力率cosθ=${cos}（遅れ）で電流I=${I}Aが流れている。線路の電圧降下vd〔V〕は?`,
    defaultSolution: [
      "単相2線式の電圧降下（近似）: vd = 2·I·(R·cosθ + X·sinθ)",
      `sinθ = ${sin}`,
      `vd = 2·${I}·(${R}·${cos} + ${X}·${sin})`,
      `vd = ${answerText} V`,
    ],
    physicallyValid: true,
  };
}

export const lineVoltageDrop: Template = {
  topic: "単相2線式の電圧降下",
  subject: "電力",
  exam: "denken3",
  difficulty: 2,
  paramSpecs: {
    current: { unit: "A", realistic_range: [1, 100] },
    resistance: { unit: "ohm", realistic_range: [0.01, 5] },
    reactance: { unit: "ohm", realistic_range: [0.01, 5] },
    power_factor: { unit: "", realistic_range: [0.5, 1] },
  },
  generate(rng) {
    const [cos, sin] = pick(PF, rng);
    return buildFrom(pick(CURRENT, rng), pick(R_SET, rng), pick(X_SET, rng), cos, sin);
  },
  generateFrom(params) {
    const { current, resistance, reactance, power_factor } = params;
    if (current === undefined || resistance === undefined || reactance === undefined || power_factor === undefined) {
      return null;
    }
    const sin = Number(Math.sqrt(Math.max(0, 1 - power_factor * power_factor)).toFixed(4));
    return buildFrom(current, resistance, reactance, power_factor, sin);
  },
};
