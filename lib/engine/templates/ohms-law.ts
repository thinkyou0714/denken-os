/**
 * テンプレート: オームの法則（端子電圧）。
 *
 * 閉形式: V = I · R   〔V〕
 *
 * 誤答（成立する典型ミス）:
 *   ① V = I/R   除算方向の取り違え
 *   ② V = R/I   分母分子の逆
 *   ③ V = I + R 単位の異なる量の誤加算
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

// (I[A], R[Ω]) の母集合。V=IR, I/R, R/I, I+R がすべて綺麗（2桁小数以内）になる組。
const SETS: ReadonlyArray<readonly [number, number]> = [
  [5, 4],
  [4, 5],
  [2, 5],
  [5, 2],
  [10, 4],
  [4, 25],
  [2, 4],
  [10, 5],
  [20, 5],
  [5, 20],
  [2, 10],
  [10, 2],
  [8, 4],
  [10, 8],
  [2, 8],
  [8, 2],
];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(I: number, R: number): GenerationResult | null {
  if (I <= 0 || R <= 0) return null;
  const V = I * R; // 正解
  const divFwd = I / R; // ① V=I/R
  const divRev = R / I; // ② V=R/I
  const added = I + R; // ③ I+R

  const vals = [V, divFwd, divRev, added];
  if (!vals.every((v) => isCleanAnswer(v))) return null;
  const answerText = formatClean(V);
  const texts = new Set(vals.map((v) => formatClean(v)));
  if (texts.size !== 4) return null;

  const choices = [...texts].sort((a, b) => Number(a) - Number(b));
  return {
    params: {
      current: { value: I, unit: "A", realistic_range: [0.1, 100] },
      resistance: { value: R, unit: "ohm", realistic_range: [0.1, 1000] },
    },
    answerValue: V,
    answerUnit: "V",
    answerText,
    choices,
    distractors: [
      { text: formatClean(divFwd), reason: "V=IR を V=I/R と取り違えた（除算方向の誤り）" },
      { text: formatClean(divRev), reason: "V=R/I と分母分子を逆にした" },
      { text: formatClean(added), reason: "電流と抵抗を加算した（単位の異なる量の誤加算）" },
    ],
    likelyWrongChoice: formatClean(divFwd),
    facts: { I, R, V },
    defaultStatement: `抵抗 ${R}Ω に電流 ${I}A が流れているとき、抵抗の端子電圧 V〔V〕は?`,
    defaultSolution: [`オームの法則 V = I·R`, `= ${I} × ${R}`, `V = ${answerText} V`],
    physicallyValid: true,
  };
}

export const ohmsLaw: Template = {
  topic: "オームの法則",
  subject: "理論",
  exam: "denken3",
  difficulty: 1,
  meta: {
    tags: ["理論", "直流回路", "オームの法則"],
    formulas: ["V = I·R", "I = V/R", "R = V/I"],
    learningObjectives: ["オームの法則で電圧・電流・抵抗を相互に求められる"],
    hints: ["V・I・R の三角形（V を I と R で割る/掛ける）", "求めるのは電圧なので掛け算", "単位は V"],
    prerequisites: ["電圧・電流・抵抗の定義"],
    relatedTopics: ["直並列合成抵抗", "分圧の法則"],
    estimatedTimeSec: 60,
    cognitiveLevel: "apply",
  },
  paramSpecs: {
    current: { unit: "A", realistic_range: [0.1, 100] },
    resistance: { unit: "ohm", realistic_range: [0.1, 1000] },
  },
  generate(rng) {
    const [I, R] = pick(SETS, rng);
    return buildFrom(I, R);
  },
  generateFrom(params) {
    const { current, resistance } = params;
    if (current === undefined || resistance === undefined) return null;
    return buildFrom(current, resistance);
  },
};
