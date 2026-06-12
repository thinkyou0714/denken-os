/**
 * テンプレート: 昇圧チョッパの出力電圧（二種二次・機械制御/パワエレ・descriptive）。
 *   出力平均電圧  Vo = Vi / (1 − D)   〔V〕（D=通流率）
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { pick } from "./helpers.js";
import type { GenerationResult, Template } from "./types.js";

const VI_SET: ReadonlyArray<number> = [100, 120, 150, 200, 300];
const D_SET: ReadonlyArray<number> = [0.2, 0.25, 0.4, 0.5, 0.6, 0.75, 0.8];

function buildFrom(Vi: number, D: number): GenerationResult | null {
  if (Vi <= 0 || D <= 0 || D >= 1) return null;
  const Vo = Vi / (1 - D);
  if (!isCleanAnswer(Vo)) return null;
  const answerText = formatClean(Vo);
  const dPercent = formatClean(D * 100);
  return {
    format: "descriptive",
    params: {
      input_voltage: { value: Vi, unit: "V", realistic_range: [100, 300] },
      duty_ratio: { value: D, unit: "", realistic_range: [0.1, 0.9] },
    },
    answerValue: Vo,
    answerUnit: "V",
    answerText,
    facts: { Vi, D, Vo },
    defaultStatement:
      `直流 Vi=${Vi}V を昇圧チョッパで変換する。通流率 D=${D}（=${dPercent}%）のとき、` +
      `出力平均電圧 Vo〔V〕を導出過程とともに求めよ。`,
    defaultSolution: [
      `昇圧チョッパの出力平均電圧 Vo=Vi/(1−D)（降圧の Vo=D·Vi と対）`,
      `Vo=${Vi}/(1−${D})`,
      `Vo=${answerText}V`,
    ],
    physicallyValid: true,
  };
}

export const boostChopper: Template = {
  topic: "昇圧チョッパの出力電圧",
  subject: "機械制御",
  exam: "denken2_secondary",
  difficulty: 3,
  paramSpecs: {
    input_voltage: { unit: "V", realistic_range: [100, 300] },
    duty_ratio: { unit: "", realistic_range: [0.1, 0.9] },
  },
  generate(rng) {
    return buildFrom(pick(VI_SET, rng), pick(D_SET, rng));
  },
  generateFrom(params) {
    const { input_voltage, duty_ratio } = params;
    if (input_voltage === undefined || duty_ratio === undefined) return null;
    return buildFrom(input_voltage, duty_ratio);
  },
};
