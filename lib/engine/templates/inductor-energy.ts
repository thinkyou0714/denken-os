/**
 * テンプレート: コイルに蓄えられる磁気エネルギー（理論・numeric）。
 *   W = (1/2)·L·I²   〔J〕
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

const L_SET: ReadonlyArray<number> = [0.1, 0.2, 0.5, 1, 2];
const I_SET: ReadonlyArray<number> = [2, 4, 5, 10, 20];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(L: number, I: number): GenerationResult | null {
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
}

export const inductorEnergy: Template = {
  topic: "コイルの磁気エネルギー",
  subject: "理論",
  exam: "denken3",
  difficulty: 2,
  paramSpecs: {
    inductance: { unit: "H", realistic_range: [0.1, 2] },
    current: { unit: "A", realistic_range: [1, 20] },
  },
  generate(rng) {
    return buildFrom(pick(L_SET, rng), pick(I_SET, rng));
  },
  generateFrom(params) {
    const { inductance, current } = params;
    if (inductance === undefined || current === undefined) return null;
    return buildFrom(inductance, current);
  },
};
