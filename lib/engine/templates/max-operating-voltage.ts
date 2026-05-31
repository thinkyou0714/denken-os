/**
 * テンプレート: 最大使用電圧（公称電圧からの換算）。
 *
 * 閉形式: V_m = V_n × 1.15 / 1.1   〔V〕
 *   V_n=公称電圧（1000V超の高圧・特別高圧の代表的換算）。
 *
 * numeric 形式（選択肢なし・許容誤差つき）。
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { gradingTolerance } from "../quality.js";
import type { GenerationResult, Template } from "./types.js";

const VN_SET: ReadonlyArray<number> = [1100, 2200, 3300, 6600, 11000, 22000, 33000, 66000];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(Vn: number): GenerationResult | null {
  if (Vn <= 1000) return null;
  const Vm = (Vn * 1.15) / 1.1; // 正解
  if (!isCleanAnswer(Vm)) return null;
  const answerText = formatClean(Vm);

  return {
    format: "numeric",
    params: {
      nominal_voltage: { value: Vn, unit: "V", realistic_range: [1100, 154000] },
    },
    answerValue: Vm,
    answerUnit: "V",
    answerText,
    facts: { Vn, Vm },
    numericTolerance: gradingTolerance(Vm),
    defaultStatement: `公称電圧 ${Vn}V の電路の最大使用電圧 V_m〔V〕を求めよ。（V_m=V_n×1.15/1.1）`,
    defaultSolution: [`V_m = V_n × 1.15/1.1`, `= ${Vn} × 1.15/1.1`, `V_m = ${answerText} V`],
    physicallyValid: true,
  };
}

export const maxOperatingVoltage: Template = {
  topic: "最大使用電圧",
  subject: "法規",
  exam: "denken3",
  difficulty: 1,
  meta: {
    tags: ["法規", "電技解釈", "最大使用電圧", "電圧区分"],
    formulas: ["1000V超: V_m = V_n × 1.15/1.1", "1000V以下: V_m = V_n × 1.15"],
    learningObjectives: ["公称電圧から最大使用電圧を換算でき、絶縁耐力試験の基準に使える"],
    hints: ["高圧・特別高圧は 1.15/1.1", "6600V → 6900V が代表例"],
    prerequisites: ["電圧の区分"],
    relatedTopics: ["絶縁耐力試験電圧"],
    references: [{ label: "電気設備技術基準の解釈 第1条（用語の定義）", article: "電技解釈 第1条" }],
    estimatedTimeSec: 90,
  },
  paramSpecs: {
    nominal_voltage: { unit: "V", realistic_range: [1100, 154000] },
  },
  generate(rng) {
    return buildFrom(pick(VN_SET, rng));
  },
  generateFrom(params) {
    const { nominal_voltage } = params;
    if (nominal_voltage === undefined) return null;
    return buildFrom(nominal_voltage);
  },
};
