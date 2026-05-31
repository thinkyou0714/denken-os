/**
 * テンプレート: 抵抗接地系統の一線地絡電流（電験二種二次「電力・管理」）。
 *
 * 閉形式: I_g = E/R_n   〔A〕   （E=相電圧、R_n=中性点接地抵抗。地絡点・線路インピーダンスは無視）
 *
 * descriptive 形式。正解値はコードで算出。
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

// [E(V), R_n(Ω)]。I_g が綺麗な組。
const SETS: ReadonlyArray<readonly [number, number]> = [
  [200, 10],
  [300, 10],
  [220, 20],
  [200, 5],
  [400, 20],
  [150, 10],
  [600, 30],
  [100, 4],
];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(E: number, Rn: number): GenerationResult | null {
  if (E <= 0 || Rn <= 0) return null;
  const Ig = E / Rn; // 正解
  if (!isCleanAnswer(Ig)) return null;
  const answerText = formatClean(Ig);

  return {
    format: "descriptive",
    params: {
      phase_voltage: { value: E, unit: "V", realistic_range: [100, 100000] },
      neutral_resistance: { value: Rn, unit: "ohm", realistic_range: [1, 1000] },
    },
    answerValue: Ig,
    answerUnit: "A",
    answerText,
    facts: { E, Rn, Ig },
    defaultStatement:
      `中性点を ${Rn}Ω の抵抗で接地した三相系統（相電圧 ${E}V）で一線地絡が生じた。` +
      `線路・地絡点インピーダンスを無視できるとき、地絡電流 I_g〔A〕を導出過程とともに求めよ。` +
      `また健全相の対地電圧の変化に触れよ。`,
    defaultSolution: [
      `地絡電流は中性点抵抗を通って流れる I_g = E/R_n`,
      `= ${E}/${Rn}`,
      `I_g = ${answerText} A`,
      `（健全相の対地電圧は地絡により上昇し、非接地に近いほど線間電圧に近づく）`,
    ],
    physicallyValid: true,
  };
}

export const neutralGroundingFault: Template = {
  topic: "中性点接地と地絡",
  subject: "電力管理",
  exam: "denken2_secondary",
  difficulty: 3,
  meta: {
    tags: ["電力管理", "二次試験", "中性点接地", "地絡電流"],
    formulas: ["抵抗接地 I_g=E/R_n", "非接地 I_g=3ωC_E·E", "健全相電圧上昇"],
    learningObjectives: ["接地方式ごとの地絡電流の大きさと健全相電圧上昇を説明・計算できる"],
    hints: ["抵抗接地は地絡電流を抵抗で制限", "I_g=相電圧/中性点抵抗", "非接地は対地静電容量経由"],
    prerequisites: ["中性点接地方式", "三相交流電力"],
    relatedTopics: ["対称座標法による故障計算", "三相短絡容量"],
    estimatedTimeSec: 480,
    cognitiveLevel: "apply",
    gradingPoints: [
      "I_g=E/R_n を正しく立式（4点）",
      "数値代入と計算が正しい（3点）",
      "健全相の対地電圧上昇に言及（2点）",
      "単位 A を明記（1点）",
    ],
    references: [{ label: "中性点接地方式と地絡保護", article: "電力・管理（二次）頻出テーマ" }],
  },
  paramSpecs: {
    phase_voltage: { unit: "V", realistic_range: [100, 100000] },
    neutral_resistance: { unit: "ohm", realistic_range: [1, 1000] },
  },
  generate(rng) {
    const [E, Rn] = pick(SETS, rng);
    return buildFrom(E, Rn);
  },
  generateFrom(params) {
    const { phase_voltage, neutral_resistance } = params;
    if (phase_voltage === undefined || neutral_resistance === undefined) return null;
    return buildFrom(phase_voltage, neutral_resistance);
  },
};
