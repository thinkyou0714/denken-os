/**
 * テンプレート: 降圧チョッパの出力電圧（二種二次・機械制御/パワエレ・descriptive）。
 *   出力平均電圧  Vo = D·Vi   〔V〕（D=通流率 ton/T）
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

const VI_SET: ReadonlyArray<number> = [100, 150, 200, 300, 400, 600];
const D_SET: ReadonlyArray<number> = [0.2, 0.25, 0.4, 0.5, 0.6, 0.75, 0.8];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(Vi: number, D: number): GenerationResult | null {
  if (Vi <= 0 || D <= 0 || D >= 1) return null;
  const Vo = D * Vi;
  if (!isCleanAnswer(Vo)) return null;
  const answerText = formatClean(Vo);
  const dPercent = formatClean(D * 100);

  return {
    format: "descriptive",
    params: {
      input_voltage: { value: Vi, unit: "V", realistic_range: [100, 600] },
      duty_ratio: { value: D, unit: "", realistic_range: [0.1, 0.9] },
    },
    answerValue: Vo,
    answerUnit: "V",
    answerText,
    facts: { Vi, D, Vo },
    defaultStatement:
      `直流 Vi=${Vi}V を降圧チョッパで変換する。通流率（デューティ比）D=${D}（=${dPercent}%）のとき、` +
      `出力平均電圧 Vo〔V〕を導出過程とともに求めよ。`,
    defaultSolution: [`降圧チョッパの出力平均電圧 Vo=D·Vi`, `Vo=${D}×${Vi}`, `Vo=${answerText}V`],
    physicallyValid: true,
  };
}

export const buckChopper: Template = {
  topic: "降圧チョッパの出力電圧",
  subject: "機械制御",
  exam: "denken2_secondary",
  difficulty: 3,
  paramSpecs: {
    input_voltage: { unit: "V", realistic_range: [100, 600] },
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
