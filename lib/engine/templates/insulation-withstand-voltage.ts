/**
 * テンプレート: 絶縁耐力試験の試験電圧（最大使用電圧 7000V 以下・交流）。
 *
 * 電技解釈 第15条: 最大使用電圧が 7000V 以下のとき
 *   試験電圧 = 最大使用電圧 × 1.5   〔V〕（最低 500V）
 *
 * 誤答（成立する典型ミス）:
 *   ① 倍率取り違え   V' = V_m × 1.25
 *   ② 高電圧側の倍率 V' = V_m × 2
 *   ③ 倍率の掛け忘れ V' = V_m
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

// 代表的な最大使用電圧（公称 ×1.15/1.1）。
const VM_SET: ReadonlyArray<number> = [1150, 2300, 3450, 6900];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(Vm: number): GenerationResult | null {
  if (Vm <= 0 || Vm > 7000) return null;
  const test = Math.max(Vm * 1.5, 500); // 正解
  const r125 = Vm * 1.25; // ①
  const r2 = Vm * 2; // ②
  const noMul = Vm; // ③

  const vals = [test, r125, r2, noMul];
  if (!vals.every((v) => isCleanAnswer(v))) return null;
  const answerText = formatClean(test);
  const texts = new Set(vals.map((v) => formatClean(v)));
  if (texts.size !== 4) return null;

  const choices = [...texts].sort((a, b) => Number(a) - Number(b));
  return {
    params: {
      max_operating_voltage: { value: Vm, unit: "V", realistic_range: [500, 7000] },
    },
    answerValue: test,
    answerUnit: "V",
    answerText,
    choices,
    distractors: [
      { text: formatClean(r125), reason: "倍率を 1.25 と取り違えた（7000V以下は 1.5 倍）" },
      { text: formatClean(r2), reason: "別区分の倍率 2 倍と混同した" },
      { text: formatClean(noMul), reason: "倍率の掛け忘れ（最大使用電圧のまま）" },
    ],
    likelyWrongChoice: formatClean(r125),
    facts: { Vm, test },
    defaultStatement:
      `最大使用電圧 ${Vm}V（7000V以下）の電路の絶縁耐力試験を行う。` + `交流試験電圧〔V〕は? （電技解釈 第15条）`,
    defaultSolution: [
      `7000V以下: 試験電圧 = 最大使用電圧 × 1.5`,
      `= ${Vm} × 1.5`,
      `試験電圧 = ${answerText} V（10分間印加）`,
    ],
    physicallyValid: true,
  };
}

export const insulationWithstandVoltage: Template = {
  topic: "絶縁耐力試験電圧",
  subject: "法規",
  exam: "denken3",
  difficulty: 2,
  meta: {
    tags: ["法規", "電技解釈", "絶縁耐力", "試験電圧"],
    formulas: ["7000V以下: 試験電圧 = 最大使用電圧 × 1.5（最低500V）"],
    learningObjectives: ["電圧区分に応じた絶縁耐力試験の試験電圧倍率を選べる"],
    hints: ["7000V以下は 1.5 倍", "10分間連続印加", "最大使用電圧を基準にする"],
    prerequisites: ["最大使用電圧"],
    relatedTopics: ["最大使用電圧", "低圧電路の絶縁抵抗"],
    references: [{ label: "電気設備技術基準の解釈 第15条", article: "電技解釈 第15条" }],
    estimatedTimeSec: 120,
  },
  paramSpecs: {
    max_operating_voltage: { unit: "V", realistic_range: [500, 7000] },
  },
  generate(rng) {
    return buildFrom(pick(VM_SET, rng));
  },
  generateFrom(params) {
    const { max_operating_voltage } = params;
    if (max_operating_voltage === undefined) return null;
    return buildFrom(max_operating_voltage);
  },
};
