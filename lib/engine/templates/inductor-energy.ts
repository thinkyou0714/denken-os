/**
 * テンプレート: コイルに蓄えられる磁気エネルギー（理論・numeric）。
 *   W = (1/2)·L·I²   〔J〕
 *
 * 新規テンプレートはこの形（defineTemplate ファクトリ）を標準とする。
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { defineTemplate, pick } from "./helpers.js";

const L_SET: ReadonlyArray<number> = [0.1, 0.2, 0.5, 1, 2];
const I_SET: ReadonlyArray<number> = [2, 4, 5, 10, 20];

type Params = {
  inductance: number;
  current: number;
};

export const inductorEnergy = defineTemplate<Params>({
  topic: "コイルの磁気エネルギー",
  subject: "理論",
  exam: "denken3",
  difficulty: 2,
  paramSpecs: {
    inductance: { unit: "H", realistic_range: [0.1, 2] },
    current: { unit: "A", realistic_range: [1, 20] },
  },
  paramOrder: ["inductance", "current"],
  draw(rng) {
    return {
      inductance: pick(L_SET, rng),
      current: pick(I_SET, rng),
    };
  },
  buildFrom({ inductance: L, current: I }) {
    if (L <= 0 || I <= 0) return null;
    const W = 0.5 * L * I * I;
    if (!isCleanAnswer(W)) return null;
    const answerText = formatClean(W);
    return {
      format: "numeric",
      params: {
        inductance: { value: L, unit: "H", realistic_range: [0.1, 2] },
        current: { value: I, unit: "A", realistic_range: [1, 20] },
      },
      answerValue: W,
      answerUnit: "J",
      answerText,
      facts: { L, I, W },
      defaultStatement: `自己インダクタンス L=${L}H のコイルに電流 I=${I}A が流れている。蓄えられる磁気エネルギー W〔J〕は?`,
      defaultSolution: [`磁気エネルギー W=(1/2)·L·I²`, `W=0.5×${L}×${I}²`, `W=${answerText}J`],
      physicallyValid: true,
    };
  },
});
