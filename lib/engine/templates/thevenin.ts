/**
 * テンプレート: テブナンの定理（等価電源で負荷電流）。
 *
 * 構成: 起電力 E、内部に R1（直列）と R2（出力に並列）、負荷 RL。
 * 開放電圧 V_th = E·R2/(R1+R2)、内部抵抗 R_th = R1·R2/(R1+R2)。
 * 閉形式: I_L = V_th/(R_th + RL)。
 *
 * 誤答（成立する典型ミス）:
 *   ① V_th/RL        内部抵抗 R_th を無視した
 *   ② E/(R_th+RL)    開放電圧でなく電源電圧 E をそのまま使った
 *   ③ V_th/(R1+RL)   R_th を R1 と取り違えた
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

// (E, R1, R2, RL): V_th, R_th, I_L と 3 誤答がすべて綺麗かつ相異なる組（R1=R2 で簡潔に）。
const SETS: ReadonlyArray<readonly [number, number, number, number]> = [
  [12, 4, 4, 1],
  [24, 8, 8, 2],
  [12, 2, 2, 2],
  [36, 12, 12, 3],
  [12, 4, 4, 4],
  [48, 8, 8, 2],
];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(E: number, R1: number, R2: number, RL: number): GenerationResult | null {
  if (E <= 0 || R1 <= 0 || R2 <= 0 || RL <= 0) return null;
  const Vth = (E * R2) / (R1 + R2);
  const Rth = (R1 * R2) / (R1 + R2);
  const IL = Vth / (Rth + RL); // 正解
  const noRth = Vth / RL; // ① R_th 無視
  const useE = E / (Rth + RL); // ② 開放電圧でなく E
  const rthAsR1 = Vth / (R1 + RL); // ③ R_th を R1 と取り違え

  const vals = [IL, noRth, useE, rthAsR1];
  if (!vals.every((v) => isCleanAnswer(v) && v > 0)) return null;
  const answerText = formatClean(IL);
  const texts = new Set(vals.map((v) => formatClean(v)));
  if (texts.size !== 4) return null;

  const choices = [...texts].sort((a, b) => Number(a) - Number(b));
  return {
    params: {
      emf: { value: E, unit: "V", realistic_range: [1, 200] },
      R1: { value: R1, unit: "ohm", realistic_range: [0.1, 100] },
      R2: { value: R2, unit: "ohm", realistic_range: [0.1, 100] },
      load: { value: RL, unit: "ohm", realistic_range: [0.1, 100] },
    },
    answerValue: IL,
    answerUnit: "A",
    answerText,
    choices,
    distractors: [
      { text: formatClean(noRth), reason: "テブナン内部抵抗 R_th を無視し、開放電圧を負荷だけで割った" },
      { text: formatClean(useE), reason: "開放電圧 V_th でなく電源電圧 E をそのまま使った" },
      { text: formatClean(rthAsR1), reason: "内部抵抗 R_th（=R1∥R2）を R1 と取り違えた" },
    ],
    likelyWrongChoice: formatClean(noRth),
    facts: { E, R1, R2, RL, Vth, Rth, IL },
    defaultStatement:
      `起電力 ${E}V、内部に ${R1}Ω（直列）と ${R2}Ω（出力端に並列）をもつ回路の出力に、負荷 ${RL}Ω を接続した。` +
      `テブナンの定理を用いて負荷電流 I_L〔A〕を求めよ。`,
    defaultSolution: [
      `開放電圧 V_th = E·R2/(R1+R2) = ${E}×${R2}/(${R1}+${R2}) = ${formatClean(Vth)} V`,
      `内部抵抗 R_th = R1·R2/(R1+R2) = ${formatClean(Rth)} Ω`,
      `I_L = V_th/(R_th+RL) = ${formatClean(Vth)}/(${formatClean(Rth)}+${RL})`,
      `I_L = ${answerText} A`,
    ],
    physicallyValid: true,
  };
}

export const thevenin: Template = {
  topic: "テブナンの定理",
  subject: "理論",
  exam: "denken3",
  difficulty: 4,
  meta: {
    tags: ["理論", "直流回路", "テブナンの定理", "等価回路"],
    formulas: ["V_th = E·R2/(R1+R2)", "R_th = R1·R2/(R1+R2)", "I_L = V_th/(R_th+RL)"],
    learningObjectives: ["回路をテブナン等価電源に縮約し、任意負荷の電流を求められる"],
    hints: ["負荷を外して開放電圧 V_th", "電源短絡で内部抵抗 R_th", "I_L = V_th/(R_th+RL)"],
    prerequisites: ["直並列合成抵抗", "重ね合わせの理"],
    relatedTopics: ["最大電力供給の定理", "重ね合わせの理"],
    estimatedTimeSec: 240,
    cognitiveLevel: "analyze",
  },
  paramSpecs: {
    emf: { unit: "V", realistic_range: [1, 200] },
    R1: { unit: "ohm", realistic_range: [0.1, 100] },
    R2: { unit: "ohm", realistic_range: [0.1, 100] },
    load: { unit: "ohm", realistic_range: [0.1, 100] },
  },
  generate(rng) {
    const [E, R1, R2, RL] = pick(SETS, rng);
    return buildFrom(E, R1, R2, RL);
  },
  generateFrom(params) {
    const { emf, R1, R2, load } = params;
    if (emf === undefined || R1 === undefined || R2 === undefined || load === undefined) return null;
    return buildFrom(emf, R1, R2, load);
  },
};
