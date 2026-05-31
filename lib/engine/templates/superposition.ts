/**
 * テンプレート: 重ね合わせの理。
 *
 * 構成: 抵抗 R に対し、電源1単独で I1=E1/R、電源2単独で I2=E2/R が同方向に流れる。
 * 閉形式: I = (E1 + E2)/R   （各電源の寄与の代数和）
 *
 * 誤答（成立する典型ミス）:
 *   ① (E1−E2)/R   向きを誤認して減算した
 *   ② E1/R        電源2の寄与を加え忘れた（片方だけ）
 *   ③ (E1+E2)/(2R) 重ね合わせを平均と勘違いした
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

// (E1,E2,R): E1≠E2、4 値が綺麗かつ相異なる組。
const SETS: ReadonlyArray<readonly [number, number, number]> = [
  [20, 10, 5],
  [30, 20, 10],
  [24, 12, 6],
  [40, 20, 10],
  [20, 12, 4],
  [21, 9, 3],
  [50, 30, 10],
  [36, 12, 6],
  [45, 15, 5],
  [28, 12, 4],
];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(E1: number, E2: number, R: number): GenerationResult | null {
  if (E1 <= 0 || E2 <= 0 || R <= 0 || E1 === E2) return null;
  const I = (E1 + E2) / R; // 正解
  const diff = Math.abs(E1 - E2) / R; // ① 減算
  const only1 = E1 / R; // ② 片方だけ
  const avg = (E1 + E2) / (2 * R); // ③ 平均

  const vals = [I, diff, only1, avg];
  if (!vals.every((v) => isCleanAnswer(v) && v > 0)) return null;
  const answerText = formatClean(I);
  const texts = new Set(vals.map((v) => formatClean(v)));
  if (texts.size !== 4) return null;

  const choices = [...texts].sort((a, b) => Number(a) - Number(b));
  return {
    params: {
      emf1: { value: E1, unit: "V", realistic_range: [1, 200] },
      emf2: { value: E2, unit: "V", realistic_range: [1, 200] },
      resistance: { value: R, unit: "ohm", realistic_range: [0.1, 100] },
    },
    answerValue: I,
    answerUnit: "A",
    answerText,
    choices,
    distractors: [
      { text: formatClean(diff), reason: "両電源の寄与の向きを誤認し、加算でなく減算した" },
      { text: formatClean(only1), reason: "電源2 単独の寄与を加え忘れた（片方の電源だけで計算）" },
      { text: formatClean(avg), reason: "重ね合わせを『平均』と勘違いし 2 で割った" },
    ],
    likelyWrongChoice: formatClean(only1),
    facts: { E1, E2, R, I },
    defaultStatement:
      `抵抗 ${R}Ω に対し、電源1 単独では I1=${E1}/${R} A、電源2 単独では I2=${E2}/${R} A が同じ向きに流れる。` +
      `重ね合わせの理により、両電源を同時に作用させたときに R を流れる電流 I〔A〕は?`,
    defaultSolution: [
      `重ね合わせの理: 各電源単独の電流を代数和する`,
      `I = E1/R + E2/R = (${E1}+${E2})/${R}`,
      `I = ${answerText} A`,
    ],
    physicallyValid: true,
  };
}

export const superposition: Template = {
  topic: "重ね合わせの理",
  subject: "理論",
  exam: "denken3",
  difficulty: 3,
  meta: {
    tags: ["理論", "直流回路", "重ね合わせの理", "回路定理"],
    formulas: ["I = ΣIk（各電源単独の電流の代数和）"],
    learningObjectives: ["線形回路で各電源の寄与を重ね合わせて電流を求められる"],
    hints: ["1 電源ずつ残し他は内部抵抗化", "向き（符号）を揃えて足す", "平均ではなく和"],
    prerequisites: ["オームの法則", "キルヒホッフの法則"],
    relatedTopics: ["テブナンの定理", "キルヒホッフの法則"],
    estimatedTimeSec: 150,
    cognitiveLevel: "apply",
  },
  paramSpecs: {
    emf1: { unit: "V", realistic_range: [1, 200] },
    emf2: { unit: "V", realistic_range: [1, 200] },
    resistance: { unit: "ohm", realistic_range: [0.1, 100] },
  },
  generate(rng) {
    const [E1, E2, R] = pick(SETS, rng);
    return buildFrom(E1, E2, R);
  },
  generateFrom(params) {
    const { emf1, emf2, resistance } = params;
    if (emf1 === undefined || emf2 === undefined || resistance === undefined) return null;
    return buildFrom(emf1, emf2, resistance);
  },
};
