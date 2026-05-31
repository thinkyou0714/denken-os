/**
 * テンプレート: 分流の法則（2 並列抵抗）。
 *
 * 閉形式: I1 = I · R2/(R1+R2)   （R1 を流れる電流。抵抗が小さい側ほど多く流れる）
 *
 * 誤答（成立する典型ミス）:
 *   ① I·R1/(R1+R2)  分流比を逆にした（自分側の抵抗を分子に置いた）
 *   ② I/2           抵抗値に依らず単純に半分とした
 *   ③ I             並列でも全電流がそのまま流れると誤認
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

// (I[A], R1[Ω], R2[Ω])。R1+R2 が I·R2 を割り切り、I/2 も綺麗になる組。
const SETS: ReadonlyArray<readonly [number, number, number]> = [
  [10, 2, 3],
  [10, 3, 2],
  [20, 1, 3],
  [20, 3, 1],
  [12, 2, 4],
  [12, 4, 2],
  [6, 2, 1],
  [6, 1, 2],
  [15, 2, 3],
  [15, 3, 2],
  [10, 1, 4],
  [10, 4, 1],
  [8, 1, 3],
  [8, 3, 1],
];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(I: number, R1: number, R2: number): GenerationResult | null {
  if (I <= 0 || R1 <= 0 || R2 <= 0) return null;
  const I1 = (I * R2) / (R1 + R2); // 正解（R1 を流れる電流）
  const swapped = (I * R1) / (R1 + R2); // ① 分流比を逆に
  const half = I / 2; // ② 単純半分
  const whole = I; // ③ 全電流

  const vals = [I1, swapped, half, whole];
  if (!vals.every((v) => isCleanAnswer(v))) return null;
  const answerText = formatClean(I1);
  const texts = new Set(vals.map((v) => formatClean(v)));
  if (texts.size !== 4) return null;

  const choices = [...texts].sort((a, b) => Number(a) - Number(b));
  return {
    params: {
      total_current: { value: I, unit: "A", realistic_range: [0.1, 100] },
      R1: { value: R1, unit: "ohm", realistic_range: [0.1, 100] },
      R2: { value: R2, unit: "ohm", realistic_range: [0.1, 100] },
    },
    answerValue: I1,
    answerUnit: "A",
    answerText,
    choices,
    distractors: [
      { text: formatClean(swapped), reason: "分流比を逆にした（求める R1 側に R1 を置いた。正しくは相手側 R2）" },
      { text: formatClean(half), reason: "抵抗値に依らず電流を単純に半分とした" },
      { text: formatClean(whole), reason: "並列接続でも全電流がそのまま枝路に流れると誤認した" },
    ],
    likelyWrongChoice: formatClean(swapped),
    facts: { I, R1, R2, I1 },
    defaultStatement: `全電流 ${I}A が、R1=${R1}Ω と R2=${R2}Ω の並列回路に流れ込む。` + `R1 を流れる電流 I1〔A〕は?`,
    defaultSolution: [`分流の法則 I1 = I·R2/(R1+R2)`, `= ${I} × ${R2}/(${R1}+${R2})`, `I1 = ${answerText} A`],
    physicallyValid: true,
  };
}

export const currentDivider: Template = {
  topic: "分流の法則",
  subject: "理論",
  exam: "denken3",
  difficulty: 2,
  meta: {
    tags: ["理論", "直流回路", "分流の法則", "並列回路"],
    formulas: ["I1 = I·R2/(R1+R2)", "I2 = I·R1/(R1+R2)"],
    learningObjectives: ["並列回路で各枝路の電流を分流比から求められる"],
    hints: ["小さい抵抗側に多く流れる", "求める枝の分子は『相手側』の抵抗", "分母は合成（和）"],
    prerequisites: ["オームの法則", "直並列合成抵抗"],
    relatedTopics: ["分圧の法則", "直並列合成抵抗"],
    estimatedTimeSec: 90,
    cognitiveLevel: "apply",
  },
  paramSpecs: {
    total_current: { unit: "A", realistic_range: [0.1, 100] },
    R1: { unit: "ohm", realistic_range: [0.1, 100] },
    R2: { unit: "ohm", realistic_range: [0.1, 100] },
  },
  generate(rng) {
    const [I, R1, R2] = pick(SETS, rng);
    return buildFrom(I, R1, R2);
  },
  generateFrom(params) {
    const { total_current, R1, R2 } = params;
    if (total_current === undefined || R1 === undefined || R2 === undefined) return null;
    return buildFrom(total_current, R1, R2);
  },
};
