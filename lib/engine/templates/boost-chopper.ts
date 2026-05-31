/**
 * テンプレート: 昇圧チョッパの出力電圧。
 *
 * 閉形式: V_o = V_i / (1 − D)   〔V〕
 *   V_i=入力電圧, D=通流率(デューティ比, 0<D<1)。
 *
 * 誤答（成立する典型ミス）:
 *   ① 降圧チョッパと混同   V_o' = V_i·D
 *   ② (1−D) を掛けた       V_o' = V_i·(1 − D)
 *   ③ 変換なし             V_o' = V_i
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

const VI_SET: ReadonlyArray<number> = [100, 120, 200, 50, 24];
const D_SET: ReadonlyArray<number> = [0.2, 0.6, 0.75, 0.8];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(Vi: number, D: number): GenerationResult | null {
  if (Vi <= 0 || D <= 0 || D >= 1) return null;
  const Vo = Vi / (1 - D); // 正解（昇圧 ⇒ Vo > Vi）
  const buck = Vi * D; // ①
  const times = Vi * (1 - D); // ②
  const same = Vi; // ③

  const vals = [Vo, buck, times, same];
  if (!vals.every((v) => isCleanAnswer(v))) return null;
  const answerText = formatClean(Vo);
  const texts = new Set(vals.map((v) => formatClean(v)));
  if (texts.size !== 4) return null;

  const choices = [...texts].sort((a, b) => Number(a) - Number(b));
  return {
    params: {
      input_voltage: { value: Vi, unit: "V", realistic_range: [10, 400] },
      duty: { value: D, unit: "", realistic_range: [0.1, 0.9] },
    },
    answerValue: Vo,
    answerUnit: "V",
    answerText,
    choices,
    distractors: [
      { text: formatClean(buck), reason: "降圧チョッパの式 V_o=D·V_i と混同した" },
      { text: formatClean(times), reason: "(1−D) を割らずに掛けてしまった" },
      { text: formatClean(same), reason: "昇圧作用を無視し入力電圧のままとした" },
    ],
    likelyWrongChoice: formatClean(buck),
    facts: { Vi, D, Vo },
    defaultStatement: `入力電圧 ${Vi}V の昇圧チョッパを通流率 D=${D} で動作させた。` + `出力電圧 V_o〔V〕は?`,
    defaultSolution: [`昇圧チョッパ: V_o = V_i/(1−D)`, `= ${Vi}/(1−${D})`, `V_o = ${answerText} V`],
    physicallyValid: true,
  };
}

export const boostChopper: Template = {
  topic: "昇圧チョッパの出力電圧",
  subject: "機械",
  exam: "denken3",
  difficulty: 2,
  meta: {
    tags: ["機械", "パワーエレクトロニクス", "チョッパ", "DC-DC変換"],
    formulas: ["昇圧: V_o = V_i/(1−D)", "降圧: V_o = D·V_i", "昇降圧: V_o = D/(1−D)·V_i"],
    learningObjectives: ["チョッパ方式ごとの入出力電圧比を通流率から導ける"],
    hints: ["昇圧は必ず入力より大きい", "分母が (1−D)", "降圧は D を掛ける"],
    prerequisites: ["直流回路", "スイッチングの基礎"],
    relatedTopics: ["降圧チョッパ", "単相全波整流回路の平均電圧"],
    estimatedTimeSec: 120,
  },
  paramSpecs: {
    input_voltage: { unit: "V", realistic_range: [10, 400] },
    duty: { unit: "", realistic_range: [0.1, 0.9] },
  },
  generate(rng) {
    const Vi = pick(VI_SET, rng);
    const D = pick(D_SET, rng);
    return buildFrom(Vi, D);
  },
  generateFrom(params) {
    const { input_voltage, duty } = params;
    if (input_voltage === undefined || duty === undefined) return null;
    return buildFrom(input_voltage, duty);
  },
};
