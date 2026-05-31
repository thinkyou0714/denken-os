/**
 * テンプレート: 対称座標法による一線地絡故障電流（電験二種二次「電力・管理」）。
 *
 * 閉形式: I_g = 3·I₀ = 3·E/(Z₁ + Z₂ + Z₀)   〔A〕   （E=相起電力）
 *
 * descriptive 形式（模範解答＋採点観点で自己採点）。正解値はコードで算出。
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

// [E(V), Z1, Z2, Z0(Ω)]。I_g が綺麗な組。
const SETS: ReadonlyArray<readonly [number, number, number, number]> = [
  [210, 2, 2, 3],
  [200, 1, 1, 3],
  [220, 2, 2, 1],
  [300, 3, 3, 4],
  [190, 1, 1, 1],
  [231, 2, 2, 3],
  [200, 2, 2, 6],
  [330, 3, 3, 5],
];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(E: number, Z1: number, Z2: number, Z0: number): GenerationResult | null {
  if (E <= 0 || Z1 <= 0 || Z2 <= 0 || Z0 <= 0) return null;
  const Ig = (3 * E) / (Z1 + Z2 + Z0); // 正解
  if (!isCleanAnswer(Ig)) return null;
  const answerText = formatClean(Ig);

  return {
    format: "descriptive",
    params: {
      phase_emf: { value: E, unit: "V", realistic_range: [100, 100000] },
      z1: { value: Z1, unit: "ohm", realistic_range: [0.1, 100] },
      z2: { value: Z2, unit: "ohm", realistic_range: [0.1, 100] },
      z0: { value: Z0, unit: "ohm", realistic_range: [0.1, 200] },
    },
    answerValue: Ig,
    answerUnit: "A",
    answerText,
    facts: { E, Z1, Z2, Z0, Ig },
    defaultStatement:
      `相起電力 ${E}V、正相・逆相・零相インピーダンスがそれぞれ Z₁=${Z1}Ω、Z₂=${Z2}Ω、Z₀=${Z0}Ω の三相系統で` +
      `一線地絡が生じた。対称座標法により地絡電流 I_g〔A〕を、導出過程とともに求めよ。`,
    defaultSolution: [
      `一線地絡では I₁=I₂=I₀、I_g=3I₀=3E/(Z₁+Z₂+Z₀)`,
      `= 3×${E}/(${Z1}+${Z2}+${Z0})`,
      `I_g = ${answerText} A`,
    ],
    physicallyValid: true,
  };
}

export const symmetricalComponents: Template = {
  topic: "対称座標法による故障計算",
  subject: "電力管理",
  exam: "denken2_secondary",
  difficulty: 4,
  meta: {
    tags: ["電力管理", "二次試験", "対称座標法", "故障計算", "地絡"],
    formulas: ["一線地絡 I_g=3E/(Z₁+Z₂+Z₀)", "三相短絡 I_s=E/Z₁", "線間短絡 I=√3E/(Z₁+Z₂)"],
    learningObjectives: ["対称座標法で各故障様相の電流を求め、正相・逆相・零相の役割を説明できる"],
    hints: ["一線地絡は3成分が直列に和", "I_g=3I₀", "三相短絡は正相のみ Z₁"],
    prerequisites: ["三相交流電力", "パーセントインピーダンスと短絡電流"],
    relatedTopics: ["三相短絡容量", "中性点接地と地絡"],
    estimatedTimeSec: 600,
    cognitiveLevel: "analyze",
    gradingPoints: [
      "一線地絡で I_g=3I₀=3E/(Z₁+Z₂+Z₀) を正しく立式（4点）",
      "正相・逆相・零相インピーダンスの直列和を理解（2点）",
      "数値代入と計算が正しい（2点）",
      "単位 A を明記（1点）",
    ],
    references: [{ label: "対称座標法による不平衡故障計算", article: "電力・管理（二次）頻出テーマ" }],
  },
  paramSpecs: {
    phase_emf: { unit: "V", realistic_range: [100, 100000] },
    z1: { unit: "ohm", realistic_range: [0.1, 100] },
    z2: { unit: "ohm", realistic_range: [0.1, 100] },
    z0: { unit: "ohm", realistic_range: [0.1, 200] },
  },
  generate(rng) {
    const [E, Z1, Z2, Z0] = pick(SETS, rng);
    return buildFrom(E, Z1, Z2, Z0);
  },
  generateFrom(params) {
    const { phase_emf, z1, z2, z0 } = params;
    if (phase_emf === undefined || z1 === undefined || z2 === undefined || z0 === undefined) return null;
    return buildFrom(phase_emf, z1, z2, z0);
  },
};
