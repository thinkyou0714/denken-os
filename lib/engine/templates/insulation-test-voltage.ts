/**
 * テンプレート: 高圧機器の絶縁耐力試験電圧（法規・numeric）。
 *   最大使用電圧 = 公称電圧 × 1.15/1.1
 *   交流試験電圧 = 最大使用電圧 × 1.5   〔V〕（最大使用電圧 7000V 以下の場合）
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { defineTemplate, pick } from "./helpers.js";

const NOMINAL_SET: ReadonlyArray<number> = [3300, 6600];

type Params = {
  nominal_voltage: number;
};

export const insulationTestVoltage = defineTemplate<Params>({
  topic: "絶縁耐力試験電圧",
  subject: "法規",
  exam: "denken2_primary",
  difficulty: 2,
  pastExam: { area: "絶縁・絶縁耐力", frequency: "high", years: [2008, 2012, 2016, 2020, 2024] },
  paramSpecs: {
    nominal_voltage: { unit: "V", realistic_range: [3300, 6600] },
  },
  paramOrder: ["nominal_voltage"],
  draw(rng) {
    return { nominal_voltage: pick(NOMINAL_SET, rng) };
  },
  buildFrom({ nominal_voltage: nominal }) {
    if (nominal <= 0) return null;
    const maxUse = (nominal * 1.15) / 1.1;
    if (maxUse > 7000) return null; // ×1.5 が適用できる範囲
    const test = maxUse * 1.5;
    if (!isCleanAnswer(test)) return null;
    const answerText = formatClean(test);
    const maxUseText = formatClean(maxUse);
    return {
      format: "numeric",
      params: {
        nominal_voltage: { value: nominal, unit: "V", realistic_range: [3300, 6600] },
      },
      answerValue: test,
      answerUnit: "V",
      answerText,
      facts: { nominal, maxUse, test },
      defaultStatement:
        `公称電圧 ${nominal}V の高圧機器について、交流絶縁耐力試験を行う。` +
        `試験電圧〔V〕を求めよ（最大使用電圧=公称×1.15/1.1、試験電圧=最大使用電圧×1.5）。`,
      defaultSolution: [
        `最大使用電圧=${nominal}×1.15/1.1=${maxUseText}V`,
        `試験電圧=最大使用電圧×1.5=${maxUseText}×1.5`,
        `試験電圧=${answerText}V`,
      ],
      physicallyValid: true,
    };
  },
});
