/**
 * テンプレート: 電力量（理論・numeric）。
 *   電力量  W = P · t   〔kWh〕（P=電力〔kW〕, t=時間〔h〕）
 *
 * 新規テンプレートはこの形（defineTemplate ファクトリ）を標準とする。
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { defineTemplate, pick } from "./helpers.js";

const P_SET: ReadonlyArray<number> = [2, 5, 10, 15, 20, 50];
const T_SET: ReadonlyArray<number> = [3, 5, 8, 10, 24];

type Params = {
  power: number;
  hours: number;
};

export const electricEnergy = defineTemplate<Params>({
  topic: "電力量",
  subject: "理論",
  exam: "denken3",
  difficulty: 1,
  paramSpecs: {
    power: { unit: "kW", realistic_range: [2, 50] },
    hours: { unit: "h", realistic_range: [3, 24] },
  },
  paramOrder: ["power", "hours"],
  draw(rng) {
    return {
      power: pick(P_SET, rng),
      hours: pick(T_SET, rng),
    };
  },
  buildFrom({ power: P, hours: t }) {
    if (P <= 0 || t <= 0) return null;
    const W = P * t;
    if (!isCleanAnswer(W)) return null;
    const answerText = formatClean(W);
    return {
      format: "numeric",
      params: {
        power: { value: P, unit: "kW", realistic_range: [2, 50] },
        hours: { value: t, unit: "h", realistic_range: [3, 24] },
      },
      answerValue: W,
      answerUnit: "kWh",
      answerText,
      facts: { P, t, W },
      defaultStatement: `消費電力 P=${P}kW の機器を t=${t}時間 使用した。消費電力量 W〔kWh〕は?`,
      defaultSolution: [`電力量 W=P·t`, `W=${P}×${t}`, `W=${answerText}kWh`],
      physicallyValid: true,
    };
  },
});
