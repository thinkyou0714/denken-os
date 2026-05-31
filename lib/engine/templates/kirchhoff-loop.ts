/**
 * テンプレート: キルヒホッフの法則（2 起電力 1 ループ）。
 *
 * 構成: 起電力 E1, E2 が逆向きに直列、抵抗 R1, R2 が直列の単一ループ。
 * 閉形式: I = (E1 − E2)/(R1 + R2)   （E1 > E2）
 *
 * 誤答（成立する典型ミス）:
 *   ① (E1+E2)/(R1+R2)  起電力の向きを誤り加算した
 *   ② E1/(R1+R2)       一方の起電力 E2 を無視
 *   ③ E2/(R1+R2)       もう一方の起電力 E1 を無視
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

// (E1,E2,R1,R2): E1>E2、(E1±E2) と E1,E2 が (R1+R2) で割り切れ、4 値が相異なる組。
const SETS: ReadonlyArray<readonly [number, number, number, number]> = [
  [18, 6, 2, 4],
  [30, 6, 2, 4],
  [20, 8, 1, 3],
  [15, 5, 1, 4],
  [24, 6, 1, 2],
  [36, 12, 2, 4],
  [21, 9, 1, 2],
  [40, 10, 2, 3],
];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(E1: number, E2: number, R1: number, R2: number): GenerationResult | null {
  if (E1 <= E2 || E2 <= 0 || R1 <= 0 || R2 <= 0) return null;
  const sumR = R1 + R2;
  const I = (E1 - E2) / sumR; // 正解
  const added = (E1 + E2) / sumR; // ① 向き誤り
  const onlyE1 = E1 / sumR; // ② E2 無視
  const onlyE2 = E2 / sumR; // ③ E1 無視

  const vals = [I, added, onlyE1, onlyE2];
  if (!vals.every((v) => isCleanAnswer(v) && v > 0)) return null;
  const answerText = formatClean(I);
  const texts = new Set(vals.map((v) => formatClean(v)));
  if (texts.size !== 4) return null;

  const choices = [...texts].sort((a, b) => Number(a) - Number(b));
  return {
    params: {
      emf1: { value: E1, unit: "V", realistic_range: [1, 200] },
      emf2: { value: E2, unit: "V", realistic_range: [1, 200] },
      R1: { value: R1, unit: "ohm", realistic_range: [0.1, 100] },
      R2: { value: R2, unit: "ohm", realistic_range: [0.1, 100] },
    },
    answerValue: I,
    answerUnit: "A",
    answerText,
    choices,
    distractors: [
      { text: formatClean(added), reason: "起電力の向きを誤り、E1+E2 として加算した（逆向きなので差）" },
      { text: formatClean(onlyE1), reason: "一方の起電力 E2 を無視した" },
      { text: formatClean(onlyE2), reason: "もう一方の起電力 E1 を無視した" },
    ],
    likelyWrongChoice: formatClean(added),
    facts: { E1, E2, R1, R2, I },
    defaultStatement:
      `起電力 ${E1}V と ${E2}V が互いに逆向きに、抵抗 ${R1}Ω と ${R2}Ω とともに 1 つの閉ループを成す。` +
      `キルヒホッフの電圧則により回路を流れる電流 I〔A〕は?`,
    defaultSolution: [
      `KVL: E1 − E2 = I·(R1+R2)（起電力は逆向きなので差）`,
      `I = (${E1} − ${E2})/(${R1}+${R2})`,
      `I = ${answerText} A`,
    ],
    physicallyValid: true,
  };
}

export const kirchhoffLoop: Template = {
  topic: "キルヒホッフの法則",
  subject: "理論",
  exam: "denken3",
  difficulty: 3,
  meta: {
    tags: ["理論", "直流回路", "キルヒホッフの法則", "回路方程式"],
    formulas: ["ΣV = 0（電圧則）", "I = (E1−E2)/(R1+R2)"],
    learningObjectives: ["閉ループに電圧則を適用し、複数起電力回路の電流を求められる"],
    hints: ["起電力の向き（極性）に注意", "逆向きの起電力は差をとる", "電圧則 ΣE = ΣIR"],
    prerequisites: ["オームの法則", "直並列合成抵抗"],
    relatedTopics: ["重ね合わせの理", "テブナンの定理"],
    estimatedTimeSec: 150,
    cognitiveLevel: "apply",
  },
  paramSpecs: {
    emf1: { unit: "V", realistic_range: [1, 200] },
    emf2: { unit: "V", realistic_range: [1, 200] },
    R1: { unit: "ohm", realistic_range: [0.1, 100] },
    R2: { unit: "ohm", realistic_range: [0.1, 100] },
  },
  generate(rng) {
    const [E1, E2, R1, R2] = pick(SETS, rng);
    return buildFrom(E1, E2, R1, R2);
  },
  generateFrom(params) {
    const { emf1, emf2, R1, R2 } = params;
    if (emf1 === undefined || emf2 === undefined || R1 === undefined || R2 === undefined) return null;
    return buildFrom(emf1, emf2, R1, R2);
  },
};
