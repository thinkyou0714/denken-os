/**
 * テンプレート: 誘導電動機の等価回路と機械出力（電験二種二次「機械・制御」）。
 *
 * 一次入力 P₁ から損失を引いて二次入力 P₂、すべりで機械出力に配分:
 *   P₂ = P₁ − P_c1 − P_i,   機械出力 P_m = (1 − s)·P₂   〔W〕
 *
 * descriptive 形式。正解値はコードで算出。
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

// [P1, P_c1(一次銅損), P_i(鉄損), s]。P_m が綺麗な組。
const SETS: ReadonlyArray<readonly [number, number, number, number]> = [
  [10000, 500, 300, 0.04],
  [5000, 200, 100, 0.05],
  [20000, 1000, 800, 0.05],
  [10000, 400, 200, 0.04],
  [8000, 300, 300, 0.05],
  [15000, 500, 500, 0.04],
  [12000, 600, 400, 0.05],
];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(P1: number, Pc1: number, Pi: number, s: number): GenerationResult | null {
  if (P1 <= 0 || Pc1 < 0 || Pi < 0 || s <= 0 || s >= 1) return null;
  const P2 = P1 - Pc1 - Pi;
  if (P2 <= 0) return null;
  const Pm = (1 - s) * P2; // 正解（機械出力）
  if (!isCleanAnswer(Pm)) return null;
  const answerText = formatClean(Pm);

  return {
    format: "descriptive",
    params: {
      input: { value: P1, unit: "W", realistic_range: [100, 1000000] },
      primary_loss: { value: Pc1, unit: "W", realistic_range: [0, 100000] },
      iron_loss: { value: Pi, unit: "W", realistic_range: [0, 100000] },
      slip: { value: s, unit: "", realistic_range: [0.01, 0.2] },
    },
    answerValue: Pm,
    answerUnit: "W",
    answerText,
    facts: { P1, Pc1, Pi, P2, s, Pm },
    defaultStatement:
      `三相誘導電動機が一次入力 ${P1}W で運転している。一次銅損 ${Pc1}W、鉄損 ${Pi}W、すべり s=${s} のとき、` +
      `等価回路に基づき機械的出力 P_m〔W〕を導出過程とともに求めよ。`,
    defaultSolution: [
      `二次入力 P₂ = P₁ − P_c1 − P_i = ${P1} − ${Pc1} − ${Pi} = ${formatClean(P2)} W`,
      `機械出力 P_m = (1 − s)·P₂ = (1 − ${s})×${formatClean(P2)}`,
      `P_m = ${answerText} W`,
      `（二次銅損 P_c2 = s·P₂、P₂:P_c2:P_m = 1:s:(1−s)）`,
    ],
    physicallyValid: true,
  };
}

export const inductionEquivalentCircuit: Template = {
  topic: "誘導電動機の等価回路",
  subject: "機械制御",
  exam: "denken2_secondary",
  difficulty: 4,
  meta: {
    tags: ["機械制御", "二次試験", "誘導機", "等価回路", "電力配分"],
    formulas: ["P₂=P₁−P_c1−P_i", "P_m=(1−s)P₂", "P₂:P_c2:P_m=1:s:(1−s)"],
    learningObjectives: ["等価回路から各損失と機械出力・効率を電力配分で求められる"],
    hints: ["一次入力から一次銅損・鉄損を引いて二次入力", "機械出力は (1−s) 倍", "二次銅損は s 倍"],
    prerequisites: ["誘導電動機の二次入力比例配分", "誘導電動機の回転速度"],
    relatedTopics: ["誘導電動機の二次入力比例配分", "誘導電動機のトルク"],
    estimatedTimeSec: 540,
    cognitiveLevel: "analyze",
    gradingPoints: [
      "二次入力 P₂=P₁−P_c1−P_i を正しく算出（3点）",
      "機械出力 P_m=(1−s)P₂ を正しく立式（3点）",
      "数値計算が正しい（2点）",
      "電力配分 1:s:(1−s) に言及（1点）",
    ],
    references: [{ label: "誘導機の等価回路と電力の流れ", article: "機械・制御（二次）頻出テーマ" }],
  },
  paramSpecs: {
    input: { unit: "W", realistic_range: [100, 1000000] },
    primary_loss: { unit: "W", realistic_range: [0, 100000] },
    iron_loss: { unit: "W", realistic_range: [0, 100000] },
    slip: { unit: "", realistic_range: [0.01, 0.2] },
  },
  generate(rng) {
    const [P1, Pc1, Pi, s] = pick(SETS, rng);
    return buildFrom(P1, Pc1, Pi, s);
  },
  generateFrom(params) {
    const { input, primary_loss, iron_loss, slip } = params;
    if (input === undefined || primary_loss === undefined || iron_loss === undefined || slip === undefined) return null;
    return buildFrom(input, primary_loss, iron_loss, slip);
  },
};
