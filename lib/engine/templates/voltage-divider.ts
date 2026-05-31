/**
 * テンプレート: 直列分圧回路。E を R1,R2 直列に加えたとき R2 両端の電圧 V2。
 *
 * 閉形式（コードが算出する唯一の真値）:
 *   V2 = E · R2 / (R1 + R2)   〔V〕
 *
 * 誤答（成立する典型ミス）:
 *   ① R1,R2 取り違え   V2' = E·R1/(R1+R2)
 *   ② 分圧し忘れ       V2' = E（電源電圧をそのまま）
 *   ③ 比の逆転         V2' = E·(R1+R2)/R2 を I 扱い…ではなく E·R1/R2 の取り違え
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

const VOLTAGES: ReadonlyArray<number> = [10, 12, 20, 24, 100, 200];
const R_PAIRS: ReadonlyArray<readonly [number, number]> = [
  [1, 1],
  [1, 3],
  [3, 1],
  [2, 3],
  [3, 2],
  [1, 4],
  [4, 1],
  [3, 5],
  [5, 3],
  [2, 8],
  [6, 4],
];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(E: number, R1: number, R2: number): GenerationResult | null {
  if (E <= 0 || R1 <= 0 || R2 <= 0) return null;
  const V2 = (E * R2) / (R1 + R2); // 正解
  const swapped = (E * R1) / (R1 + R2); // ① 取り違え
  const noDivide = E; // ② 分圧し忘れ
  const ratio = (E * R2) / R1; // ③ 直列を無視して比だけ掛けた

  const vals = [V2, swapped, noDivide, ratio];
  if (!vals.every((v) => isCleanAnswer(v))) return null;
  const answerText = formatClean(V2);
  const texts = new Set([answerText, formatClean(swapped), formatClean(noDivide), formatClean(ratio)]);
  if (texts.size !== 4) return null;

  const choices = [...texts].sort((a, b) => Number(a) - Number(b));
  return {
    params: {
      emf: { value: E, unit: "V", realistic_range: [10, 200] },
      R1: { value: R1, unit: "ohm", realistic_range: [1, 100] },
      R2: { value: R2, unit: "ohm", realistic_range: [1, 100] },
    },
    answerValue: V2,
    answerUnit: "V",
    answerText,
    choices,
    distractors: [
      { text: formatClean(swapped), reason: "R1 と R2 を取り違え、R1 側の分圧を答えた" },
      { text: formatClean(noDivide), reason: "分圧を忘れ、電源電圧 E をそのまま答えた" },
      { text: formatClean(ratio), reason: "直列合成 (R1+R2) でなく R1 で割ってしまった" },
    ],
    likelyWrongChoice: formatClean(swapped),
    facts: { E, R1, R2, V2 },
    defaultStatement: `起電力${E}Vの電源に抵抗R1=${R1}Ω と R2=${R2}Ω を直列接続した。` + `R2 の両端電圧 V2〔V〕は?`,
    defaultSolution: [
      `直列回路の電流 I=E/(R1+R2)=${E}/${R1 + R2} A`,
      `V2=I·R2=E·R2/(R1+R2)=${E}·${R2}/${R1 + R2}`,
      `V2=${answerText} V`,
    ],
    physicallyValid: true,
  };
}

export const voltageDivider: Template = {
  topic: "分圧の法則",
  subject: "理論",
  exam: "denken3",
  difficulty: 1,
  meta: {
    tags: ["理論", "直流回路", "分圧", "オームの法則"],
    formulas: ["V2 = E·R2/(R1+R2)", "I = E/(R1+R2)"],
    learningObjectives: ["直列回路で各抵抗にかかる電圧が抵抗比に比例することを説明できる"],
    hints: ["まず直列合成抵抗 R1+R2 を求める", "回路電流 I は直列なら共通", "V2 = I·R2"],
    prerequisites: ["オームの法則", "直並列合成抵抗"],
    relatedTopics: ["分流の法則", "ブリッジ回路の平衡条件"],
    estimatedTimeSec: 90,
  },
  paramSpecs: {
    emf: { unit: "V", realistic_range: [10, 200] },
    R1: { unit: "ohm", realistic_range: [1, 100] },
    R2: { unit: "ohm", realistic_range: [1, 100] },
  },
  generate(rng) {
    const E = pick(VOLTAGES, rng);
    const [R1, R2] = pick(R_PAIRS, rng);
    return buildFrom(E, R1, R2);
  },
  generateFrom(params) {
    const { emf, R1, R2 } = params;
    if (emf === undefined || R1 === undefined || R2 === undefined) return null;
    return buildFrom(emf, R1, R2);
  },
};
