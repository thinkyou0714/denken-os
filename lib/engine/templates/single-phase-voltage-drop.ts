/**
 * テンプレート: 単相2線式の電圧降下（電力・numeric）。
 *   往復2線分の電圧降下  v = 2·I·(R·cosθ + X·sinθ)  〔V〕
 *   （三相3線式の √3 を避け、係数2で綺麗な値に収める一次の基本問題）
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

const I_SET: ReadonlyArray<number> = [5, 10, 15, 20, 25, 30, 50];
const RX_SET: ReadonlyArray<readonly [number, number]> = [
  [0.3, 0.4],
  [0.5, 0.5],
  [0.2, 0.3],
  [0.4, 0.3],
  [0.6, 0.8],
];
// [cosθ, sinθ]（遅れ）。両方綺麗な力率。
const PF_SET: ReadonlyArray<readonly [number, number]> = [
  [0.8, 0.6],
  [0.6, 0.8],
  [1.0, 0.0],
];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(I: number, R: number, X: number, cos: number, sin: number): GenerationResult | null {
  if (I <= 0 || R <= 0 || X < 0 || cos <= 0 || cos > 1) return null;
  const v = 2 * I * (R * cos + X * sin);
  if (v <= 0 || !isCleanAnswer(v)) return null;
  const answerText = formatClean(v);

  return {
    format: "numeric",
    params: {
      line_current: { value: I, unit: "A", realistic_range: [5, 50] },
      resistance: { value: R, unit: "ohm", realistic_range: [0.1, 1] },
      reactance: { value: X, unit: "ohm", realistic_range: [0, 1] },
      power_factor: { value: cos, unit: "", realistic_range: [0.5, 1] },
    },
    answerValue: v,
    answerUnit: "V",
    answerText,
    facts: { I, R, X, cos, sin, v },
    defaultStatement:
      `単相2線式の線路で、線電流 I=${I}A、1線の抵抗 R=${R}Ω、リアクタンス X=${X}Ω、` +
      `負荷力率 cosθ=${cos}（遅れ）である。線路の電圧降下 v〔V〕を v≈2I(Rcosθ+Xsinθ) で求めよ。`,
    defaultSolution: [
      `単相2線式は往復2線分: v=2·I·(R·cosθ+X·sinθ)`,
      `v=2×${I}×(${R}×${cos}+${X}×${sin})`,
      `v=${answerText}V`,
    ],
    physicallyValid: true,
  };
}

export const singlePhaseVoltageDrop: Template = {
  topic: "単相2線式の電圧降下",
  subject: "電力",
  exam: "denken2_primary",
  difficulty: 2,
  paramSpecs: {
    line_current: { unit: "A", realistic_range: [5, 50] },
    resistance: { unit: "ohm", realistic_range: [0.1, 1] },
    reactance: { unit: "ohm", realistic_range: [0, 1] },
    power_factor: { unit: "", realistic_range: [0.5, 1] },
  },
  generate(rng) {
    const [R, X] = pick(RX_SET, rng);
    const [cos, sin] = pick(PF_SET, rng);
    return buildFrom(pick(I_SET, rng), R, X, cos, sin);
  },
  generateFrom(params) {
    const { line_current, resistance, reactance, power_factor } = params;
    if (
      line_current === undefined ||
      resistance === undefined ||
      reactance === undefined ||
      power_factor === undefined
    ) {
      return null;
    }
    const sin = Number(Math.sqrt(1 - power_factor * power_factor).toFixed(4));
    return buildFrom(line_current, resistance, reactance, power_factor, sin);
  },
};
