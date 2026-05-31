/**
 * テンプレート: 中性点接地方式の特徴（定性・選択式）。
 *
 * 4 方式（直接／抵抗／非接地／消弧リアクトル）から 1 つを問い、その主特徴を選ばせる。
 * 誤答は「他方式の特徴」（=成立する典型的な取り違え）。
 * 数値でなく概念理解（understand）を問う設問。出題ごとに対象方式が変わる。
 */
import type { GenerationResult, Template } from "./types.js";

interface Method {
  name: string;
  feature: string;
}

// 選択肢の正準順（昇順固定。answer はこの中の 1 つ）。
const METHODS: ReadonlyArray<Method> = [
  {
    name: "直接接地",
    feature: "地絡時の健全相の電位上昇が小さく機器絶縁を低減できるが、地絡電流が大きく高速遮断を要する",
  },
  {
    name: "抵抗接地",
    feature: "中性点を抵抗で接地し、地絡電流を適度に制限して通信線誘導と保護協調を両立させる",
  },
  {
    name: "非接地",
    feature: "地絡電流は小さいが、一線地絡時に健全相の対地電圧が線間電圧まで上昇する",
  },
  {
    name: "消弧リアクトル接地",
    feature: "対地静電容量と並列共振させ、一線地絡（アーク）電流をほぼ零に抑え自然消弧させる",
  },
];

function buildFrom(idx: number): GenerationResult | null {
  if (!Number.isInteger(idx) || idx < 0 || idx >= METHODS.length) return null;
  const subject = METHODS[idx]!;
  const choices = METHODS.map((m) => m.feature); // 正準順で固定
  const answerText = subject.feature;

  return {
    format: "multiple_choice",
    params: {
      variant: { value: idx, unit: "", realistic_range: [0, METHODS.length - 1] },
    },
    answerValue: idx,
    answerUnit: "",
    answerText,
    choices,
    distractors: METHODS.filter((_, i) => i !== idx).map((m) => ({
      text: m.feature,
      reason: `これは「${m.name}方式」の特徴であり、設問の方式の特徴ではない`,
    })),
    likelyWrongChoice: METHODS[(idx + 1) % METHODS.length]!.feature,
    facts: { method: subject.name },
    defaultStatement: `中性点接地方式のうち「${subject.name}方式」の主な特徴として最も適切なものはどれか。`,
    defaultSolution: [
      `${subject.name}方式の要点: ${subject.feature}`,
      `他方式（直接／抵抗／非接地／消弧リアクトル）の特徴と混同しないよう、地絡電流の大きさと健全相電圧上昇の観点で整理する`,
    ],
    physicallyValid: true,
  };
}

export const neutralGrounding: Template = {
  topic: "中性点接地方式",
  subject: "電力",
  exam: "denken3",
  difficulty: 2,
  meta: {
    tags: ["電力", "送配電", "中性点接地", "地絡"],
    formulas: ["（定性）地絡電流の大小と健全相電位上昇のトレードオフ"],
    learningObjectives: ["中性点接地4方式の特徴（地絡電流・絶縁・通信誘導）を区別できる"],
    hints: [
      "地絡電流が大きい順: 直接>抵抗>非接地≒消弧",
      "非接地は健全相電圧が√3倍に",
      "消弧リアクトルは並列共振で消弧",
    ],
    prerequisites: ["三相交流の基礎"],
    relatedTopics: ["中性点接地と地絡", "対称座標法による故障計算"],
    estimatedTimeSec: 90,
    cognitiveLevel: "understand",
  },
  paramSpecs: {
    variant: { unit: "", realistic_range: [0, METHODS.length - 1] },
  },
  generate(rng) {
    return buildFrom(Math.floor(rng() * METHODS.length));
  },
  generateFrom(params) {
    const { variant } = params;
    if (variant === undefined) return null;
    return buildFrom(variant);
  },
};
