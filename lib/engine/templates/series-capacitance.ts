/**
 * テンプレート: コンデンサの直列合成容量（理論・numeric）。
 *   直列: C = C1·C2/(C1+C2)（和分の積）。並列の単純和との取り違えが最頻誤答。
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

/** 合成値が綺麗になる (C1, C2) μF の組。 */
const C_PAIRS: ReadonlyArray<readonly [number, number]> = [
  [3, 6],
  [6, 3],
  [4, 12],
  [12, 4],
  [6, 12],
  [12, 6],
  [10, 40],
  [40, 10],
  [20, 30],
  [30, 20],
  [12, 24],
  [24, 12],
  [15, 30],
  [10, 15],
  [5, 20],
];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(c1: number, c2: number): GenerationResult | null {
  if (c1 <= 0 || c2 <= 0) return null;
  const c = (c1 * c2) / (c1 + c2);
  if (!isCleanAnswer(c)) return null;
  const answerText = formatClean(c);
  return {
    format: "numeric",
    params: {
      cap1: { value: c1, unit: "μF", realistic_range: [1, 100] },
      cap2: { value: c2, unit: "μF", realistic_range: [1, 100] },
    },
    answerValue: c,
    answerUnit: "μF",
    answerText,
    facts: { c1, c2, c, parallel: c1 + c2 },
    defaultStatement: `静電容量 ${formatClean(c1)}μF と ${formatClean(c2)}μF のコンデンサを直列に接続したときの合成静電容量〔μF〕は?`,
    defaultSolution: [
      `直列接続の合成容量 C=C1·C2/(C1+C2)（並列なら単純和 ${formatClean(c1 + c2)}μF になることと混同しない）`,
      `=${formatClean(c1)}×${formatClean(c2)}/(${formatClean(c1)}+${formatClean(c2)})`,
      `=${answerText}μF`,
    ],
    physicallyValid: true,
  };
}

export const seriesCapacitance: Template = {
  topic: "コンデンサの直列合成容量",
  subject: "理論",
  exam: "denken2_primary",
  difficulty: 2,
  paramSpecs: {
    cap1: { unit: "μF", realistic_range: [1, 100] },
    cap2: { unit: "μF", realistic_range: [1, 100] },
  },
  generate(rng) {
    const [c1, c2] = pick(C_PAIRS, rng);
    return buildFrom(c1, c2);
  },
  generateFrom(params) {
    const { cap1, cap2 } = params;
    if (cap1 === undefined || cap2 === undefined) return null;
    return buildFrom(cap1, cap2);
  },
};
