/**
 * テンプレート: 風圧荷重（受圧面に働く力）。
 *
 * 閉形式: W = p · A   〔N〕   （p=風圧 [Pa=N/m²]、A=受圧（投影）面積 [m²]）
 *
 * 誤答（成立する典型ミス）:
 *   ① p        受圧面積 A を掛け忘れ、風圧そのものを荷重とした
 *   ② 2·W      風圧種別（甲種・乙種）の係数を 2 倍に誤った
 *   ③ W/2      係数を半分に誤った
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

// [p(Pa), A(m²)]。A=0.5（p=2W になる）は除外。W,p,2W,W/2 が綺麗かつ相異なる組。
const SETS: ReadonlyArray<readonly [number, number]> = [
  [490, 0.2],
  [588, 0.3],
  [980, 0.2],
  [980, 0.3],
  [1470, 0.2],
  [784, 0.25],
  [490, 0.4],
  [980, 1],
  [588, 0.2],
  [1470, 0.4],
];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(p: number, A: number): GenerationResult | null {
  if (p <= 0 || A <= 0 || A === 0.5) return null;
  const W = p * A; // 正解
  const noArea = p; // ①
  const dbl = 2 * W; // ②
  const half = W / 2; // ③

  const vals = [W, noArea, dbl, half];
  if (!vals.every((v) => isCleanAnswer(v))) return null;
  const answerText = formatClean(W);
  const texts = new Set(vals.map((v) => formatClean(v)));
  if (texts.size !== 4) return null;

  const choices = [...texts].sort((a, b) => Number(a) - Number(b));
  return {
    params: {
      wind_pressure: { value: p, unit: "Pa", realistic_range: [200, 4000] },
      area: { value: A, unit: "m2", realistic_range: [0.05, 50] },
    },
    answerValue: W,
    answerUnit: "N",
    answerText,
    choices,
    distractors: [
      { text: formatClean(noArea), reason: "受圧面積 A を掛け忘れ、風圧そのものを荷重とした" },
      { text: formatClean(dbl), reason: "風圧種別（甲種・乙種）の係数を 2 倍に誤った" },
      { text: formatClean(half), reason: "係数を半分に誤った" },
    ],
    likelyWrongChoice: formatClean(noArea),
    facts: { p, A, W },
    defaultStatement: `風圧 ${p}Pa が、受圧（投影）面積 ${A}m² の構造物に作用している。この構造物に働く風圧荷重 W〔N〕は?`,
    defaultSolution: [`W = p·A`, `= ${p} × ${A}`, `W = ${answerText} N`],
    physicallyValid: true,
  };
}

export const windLoad: Template = {
  topic: "風圧荷重",
  subject: "法規",
  exam: "denken3",
  difficulty: 2,
  meta: {
    tags: ["法規", "電技解釈", "風圧荷重", "機械的強度"],
    formulas: ["W = p·A 〔N〕", "甲種/乙種/丙種で風圧 p が異なる"],
    learningObjectives: ["受圧面積と風圧から風圧荷重を求められる"],
    hints: ["荷重 = 風圧 × 投影面積", "風圧は Pa=N/m²", "種別（甲乙丙）で風圧値が変わる"],
    prerequisites: ["力とモーメント"],
    relatedTopics: ["支線の張力", "架空電線のたるみ（弛度）"],
    estimatedTimeSec: 90,
    cognitiveLevel: "apply",
    references: [{ label: "電気設備技術基準の解釈 第58条", article: "架空電線路の風圧荷重" }],
  },
  paramSpecs: {
    wind_pressure: { unit: "Pa", realistic_range: [200, 4000] },
    area: { unit: "m2", realistic_range: [0.05, 50] },
  },
  generate(rng) {
    const [p, A] = pick(SETS, rng);
    return buildFrom(p, A);
  },
  generateFrom(params) {
    const { wind_pressure, area } = params;
    if (wind_pressure === undefined || area === undefined) return null;
    return buildFrom(wind_pressure, area);
  },
};
