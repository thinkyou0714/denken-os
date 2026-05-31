/**
 * テンプレート: RLC 直列共振の角周波数。
 *
 * 閉形式: ω₀ = 1/√(L·C)   〔rad/s〕   （X_L = X_C となる角周波数）
 *
 * 誤答（成立する典型ミス）— ω₀ は √(LC) に反比例するため、L・C の読み違えが値に強く効く:
 *   ① 2ω₀     L または C を 1/4 倍に読み違えた
 *   ② ω₀/2    L または C を 4 倍に読み違えた
 *   ③ 4ω₀     L と C をともに 1/4 倍に読み違えた（積で 1/16）
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

// [L(mH), C(µF)] → ω₀ が整数（かつ偶数）になる組。
const SETS: ReadonlyArray<readonly [number, number]> = [
  [1, 1000],
  [4, 1000],
  [1, 250],
  [4, 250],
  [1, 40],
  [1, 10],
  [1, 4000],
  [1, 160],
];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(L_mH: number, C_uF: number): GenerationResult | null {
  if (L_mH <= 0 || C_uF <= 0) return null;
  const L = L_mH * 1e-3;
  const C = C_uF * 1e-6;
  const raw = 1 / Math.sqrt(L * C);
  const w0 = Math.round(raw);
  // 整数（綺麗な）ω₀ のみ採用。FP 誤差や非整数は棄却。
  if (w0 <= 0 || Math.abs(raw - w0) > 1e-6 * w0) return null;
  const dbl = 2 * w0; // ①
  const half = w0 / 2; // ②
  const quad = 4 * w0; // ③

  const vals = [w0, dbl, half, quad];
  if (!vals.every((v) => isCleanAnswer(v))) return null;
  const answerText = formatClean(w0);
  const texts = new Set(vals.map((v) => formatClean(v)));
  if (texts.size !== 4) return null;

  const choices = [...texts].sort((a, b) => Number(a) - Number(b));
  return {
    params: {
      inductance_mh: { value: L_mH, unit: "mH", realistic_range: [0.1, 1000] },
      capacitance_uf: { value: C_uF, unit: "uF", realistic_range: [0.1, 10000] },
    },
    answerValue: w0,
    answerUnit: "rad/s",
    answerText,
    choices,
    distractors: [
      { text: formatClean(dbl), reason: "L または C を 1/4 倍に読み違えた（ω₀∝1/√(LC) なので 2 倍）" },
      { text: formatClean(half), reason: "L または C を 4 倍に読み違えた（ω₀ は半分）" },
      { text: formatClean(quad), reason: "L と C をともに 1/4 倍に読み違えた（積で 1/16、ω₀ は 4 倍）" },
    ],
    likelyWrongChoice: formatClean(half),
    facts: { L_mH, C_uF, w0 },
    defaultStatement:
      `インダクタンス ${L_mH}mH のコイルと ${C_uF}µF のコンデンサを直列接続した。` +
      `この回路が直列共振する角周波数 ω₀〔rad/s〕は?`,
    defaultSolution: [
      `直列共振は X_L = X_C すなわち ω₀L = 1/(ω₀C) のとき`,
      `ω₀ = 1/√(L·C) = 1/√(${L_mH}×10⁻³ × ${C_uF}×10⁻⁶)`,
      `ω₀ = ${answerText} rad/s`,
    ],
    physicallyValid: true,
  };
}

export const seriesResonance: Template = {
  topic: "直列共振",
  subject: "理論",
  exam: "denken3",
  difficulty: 3,
  meta: {
    tags: ["理論", "交流回路", "共振", "RLC"],
    formulas: ["ω₀ = 1/√(LC)", "f₀ = 1/(2π√(LC))", "共振時 Z = R（最小）"],
    learningObjectives: ["直列共振の角周波数を L・C から求め、共振の意味を説明できる"],
    hints: ["X_L = X_C が共振条件", "ω₀ は √(LC) に反比例", "共振でインピーダンス最小・電流最大"],
    prerequisites: ["RLC直列回路のインピーダンス"],
    relatedTopics: ["並列共振", "RLC直列回路のインピーダンス"],
    estimatedTimeSec: 150,
    cognitiveLevel: "apply",
  },
  paramSpecs: {
    inductance_mh: { unit: "mH", realistic_range: [0.1, 1000] },
    capacitance_uf: { unit: "uF", realistic_range: [0.1, 10000] },
  },
  generate(rng) {
    const [L, C] = pick(SETS, rng);
    return buildFrom(L, C);
  },
  generateFrom(params) {
    const { inductance_mh, capacitance_uf } = params;
    if (inductance_mh === undefined || capacitance_uf === undefined) return null;
    return buildFrom(inductance_mh, capacitance_uf);
  },
};
