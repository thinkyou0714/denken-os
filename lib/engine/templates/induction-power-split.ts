/**
 * テンプレート: 三相誘導電動機の二次入力の比例配分。
 *
 * 比例配分: P2 : P_c2 : P_m = 1 : s : (1 − s)
 *   P2=二次入力, P_c2=二次銅損, P_m=機械出力, s=すべり。
 *   本問は機械出力 P_m = P2·(1 − s) を求める。
 *
 * 誤答（成立する典型ミス）:
 *   ① 二次銅損を答えた    P_m' = s·P2
 *   ② すべりを無視        P_m' = P2
 *   ③ (1+s) で計算        P_m' = P2·(1 + s)
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

const P2_SET: ReadonlyArray<number> = [4, 5, 8, 10, 12, 20, 40, 50];
const SLIP_SET: ReadonlyArray<number> = [2, 3, 4, 5, 8, 10]; // %

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(P2: number, slipPct: number): GenerationResult | null {
  if (P2 <= 0 || slipPct <= 0 || slipPct >= 100) return null;
  const s = slipPct / 100;
  const Pm = P2 * (1 - s); // 正解
  const Pc2 = s * P2; // ①
  const ignore = P2; // ②
  const plus = P2 * (1 + s); // ③

  const vals = [Pm, Pc2, ignore, plus];
  if (!vals.every((v) => isCleanAnswer(v))) return null;
  const answerText = formatClean(Pm);
  const texts = new Set(vals.map((v) => formatClean(v)));
  if (texts.size !== 4) return null;

  const choices = [...texts].sort((a, b) => Number(a) - Number(b));
  return {
    params: {
      secondary_input: { value: P2, unit: "kW", realistic_range: [1, 200] },
      slip: { value: slipPct, unit: "%", realistic_range: [1, 15] },
    },
    answerValue: Pm,
    answerUnit: "kW",
    answerText,
    choices,
    distractors: [
      { text: formatClean(Pc2), reason: "二次銅損 P_c2=s·P2 を機械出力と取り違えた" },
      { text: formatClean(ignore), reason: "すべりを無視し二次入力をそのまま出力とした" },
      { text: formatClean(plus), reason: "(1−s) を (1+s) と取り違えた" },
    ],
    likelyWrongChoice: formatClean(Pc2),
    facts: { P2, slipPct, Pm },
    defaultStatement:
      `三相誘導電動機の二次入力が ${P2}kW、すべり ${slipPct}% である。` +
      `機械的出力 P_m〔kW〕は? （P2:P_c2:P_m = 1:s:(1−s)）`,
    defaultSolution: [
      `比例配分 P2 : P_c2 : P_m = 1 : s : (1−s)`,
      `P_m = P2·(1−s) = ${P2}×(1−${s})`,
      `P_m = ${answerText} kW`,
    ],
    physicallyValid: true,
  };
}

export const inductionPowerSplit: Template = {
  topic: "誘導電動機の二次入力比例配分",
  subject: "機械",
  exam: "denken3",
  difficulty: 3,
  meta: {
    tags: ["機械", "誘導機", "すべり", "比例配分", "二次銅損"],
    formulas: ["P2 : P_c2 : P_m = 1 : s : (1−s)", "P_c2 = s·P2", "P_m = (1−s)·P2"],
    learningObjectives: ["二次入力・二次銅損・機械出力のすべりによる比例配分を使い分けられる"],
    hints: ["二次入力を 1 とすると銅損が s", "機械出力は (1−s)", "効率 ≒ (1−s)"],
    prerequisites: ["誘導電動機の回転速度", "三相交流電力"],
    relatedTopics: ["誘導電動機のトルク", "誘導電動機の効率"],
    estimatedTimeSec: 150,
  },
  paramSpecs: {
    secondary_input: { unit: "kW", realistic_range: [1, 200] },
    slip: { unit: "%", realistic_range: [1, 15] },
  },
  generate(rng) {
    const P2 = pick(P2_SET, rng);
    const slip = pick(SLIP_SET, rng);
    return buildFrom(P2, slip);
  },
  generateFrom(params) {
    const { secondary_input, slip } = params;
    if (secondary_input === undefined || slip === undefined) return null;
    return buildFrom(secondary_input, slip);
  },
};
