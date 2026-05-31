/**
 * テンプレート: 調相設備（力率改善コンデンサ）容量（電験二種二次「電力・管理」）。
 *
 * 閉形式: Q_c = P·(tanθ₁ − tanθ₂)   〔kvar〕   （cosθ₁→cosθ₂ へ改善）
 *
 * descriptive 形式。正解値はコードで算出（2桁丸め）。
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

const round2 = (x: number) => Math.round(x * 100) / 100;
const tanOf = (c: number) => Math.sqrt(1 - c * c) / c;

// [P(kW), cosθ前, cosθ後]。改善なので cos前<cos後。
const SETS: ReadonlyArray<readonly [number, number, number]> = [
  [300, 0.6, 0.8],
  [400, 0.6, 0.8],
  [600, 0.6, 0.8],
  [300, 0.6, 1.0],
  [400, 0.8, 1.0],
  [500, 0.8, 1.0],
  [360, 0.6, 0.8],
  [240, 0.6, 0.8],
];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(P: number, c1: number, c2: number): GenerationResult | null {
  if (P <= 0 || c1 <= 0 || c1 > 1 || c2 <= 0 || c2 > 1 || c1 >= c2) return null;
  const Qc = round2(P * (tanOf(c1) - tanOf(c2))); // 正解
  if (!(Qc > 0) || !isCleanAnswer(Qc)) return null;
  const answerText = formatClean(Qc);

  return {
    format: "descriptive",
    params: {
      active_power: { value: P, unit: "kW", realistic_range: [10, 10000] },
      pf_before: { value: c1, unit: "", realistic_range: [0.5, 0.95] },
      pf_after: { value: c2, unit: "", realistic_range: [0.85, 1.0] },
    },
    answerValue: Qc,
    answerUnit: "kvar",
    answerText,
    facts: { P, c1, c2, Qc },
    defaultStatement:
      `有効電力 ${P}kW の負荷の力率を cosθ₁=${c1}（遅れ）から cosθ₂=${c2} に改善したい。` +
      `必要なコンデンサ（調相設備）容量 Q_c〔kvar〕を導出過程とともに求めよ。`,
    defaultSolution: [
      `Q_c = P·(tanθ₁ − tanθ₂)`,
      `tanθ₁=√(1−${c1}²)/${c1}、tanθ₂=√(1−${c2}²)/${c2}`,
      `Q_c = ${P}×(${round2(tanOf(c1))} − ${round2(tanOf(c2))})`,
      `Q_c ≒ ${answerText} kvar`,
    ],
    physicallyValid: true,
  };
}

export const reactiveCompensation: Template = {
  topic: "調相設備",
  subject: "電力管理",
  exam: "denken2_secondary",
  difficulty: 3,
  meta: {
    tags: ["電力管理", "二次試験", "調相設備", "力率改善", "無効電力"],
    formulas: ["Q_c = P(tanθ₁ − tanθ₂) 〔kvar〕", "tanθ = √(1−cos²θ)/cosθ"],
    learningObjectives: ["目標力率に改善するための調相設備容量を求められる"],
    hints: ["無効電力の差を補償する", "Q=P·tanθ", "進み無効電力で遅れを打ち消す"],
    prerequisites: ["力率改善用コンデンサ容量", "三相交流電力"],
    relatedTopics: ["力率改善用コンデンサ容量", "電力系統の安定度"],
    estimatedTimeSec: 420,
    cognitiveLevel: "apply",
    gradingPoints: [
      "Q_c=P(tanθ₁−tanθ₂) を正しく立式（3点）",
      "各力率角の tan を正しく算出（3点）",
      "数値計算が正しい（2点）",
      "単位 kvar を明記（1点）",
    ],
    references: [{ label: "調相設備による力率・電圧調整", article: "電力・管理（二次）頻出テーマ" }],
  },
  paramSpecs: {
    active_power: { unit: "kW", realistic_range: [10, 10000] },
    pf_before: { unit: "", realistic_range: [0.5, 0.95] },
    pf_after: { unit: "", realistic_range: [0.85, 1.0] },
  },
  generate(rng) {
    const [P, c1, c2] = pick(SETS, rng);
    return buildFrom(P, c1, c2);
  },
  generateFrom(params) {
    const { active_power, pf_before, pf_after } = params;
    if (active_power === undefined || pf_before === undefined || pf_after === undefined) return null;
    return buildFrom(active_power, pf_before, pf_after);
  },
};
