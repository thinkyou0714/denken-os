/**
 * テンプレート: 蓄電池の容量（機械・numeric）。
 *   容量 C〔Ah〕 = 放電電流 I〔A〕 × 放電時間 t〔h〕
 *   （非常用電源・UPS設計の基本。容量換算係数や保守率は二次で扱う）
 *
 * 新規テンプレートはこの形（defineTemplate ファクトリ）を標準とする。
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { defineTemplate, pick } from "./helpers.js";

const I_SET: ReadonlyArray<number> = [2, 4, 5, 8, 10, 12.5, 20, 25, 40, 50];
const T_SET: ReadonlyArray<number> = [0.5, 1, 2, 3, 5, 10];

type Params = {
  current: number;
  hours: number;
};

export const batteryCapacity = defineTemplate<Params>({
  topic: "蓄電池の容量",
  subject: "機械",
  exam: "denken2_primary",
  difficulty: 2,
  pastExam: { area: "電熱・電気化学", frequency: "low", years: [2013, 2019, 2024] },
  paramSpecs: {
    current: { unit: "A", realistic_range: [1, 100] },
    hours: { unit: "h", realistic_range: [0.25, 24] },
  },
  paramOrder: ["current", "hours"],
  draw(rng) {
    return {
      current: pick(I_SET, rng),
      hours: pick(T_SET, rng),
    };
  },
  buildFrom({ current, hours }) {
    if (current <= 0 || hours <= 0) return null;
    const capacity = current * hours;
    if (!isCleanAnswer(capacity)) return null;
    const answerText = formatClean(capacity);
    return {
      format: "numeric",
      params: {
        current: { value: current, unit: "A", realistic_range: [1, 100] },
        hours: { value: hours, unit: "h", realistic_range: [0.25, 24] },
      },
      answerValue: capacity,
      answerUnit: "Ah",
      answerText,
      facts: { current, hours, capacity },
      defaultStatement:
        `負荷電流 ${formatClean(current)}A を ${formatClean(hours)}時間 連続して供給できる蓄電池に` +
        `最低限必要な容量〔Ah〕は?（容量換算係数・余裕率は考えない）`,
      defaultSolution: [`蓄電池容量 C=I×t`, `=${formatClean(current)}×${formatClean(hours)}`, `=${answerText}Ah`],
      physicallyValid: true,
    };
  },
});
