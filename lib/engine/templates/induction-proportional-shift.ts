/**
 * テンプレート: 巻線形誘導電動機の比例推移（二種二次・機械制御・descriptive）。
 *   同一トルクを与える滑りは二次回路抵抗に比例する:
 *     r2/s1 = (r2+R)/s2  ⇒  R = r2·(s2−s1)/s1   〔Ω〕
 *   （二次抵抗を R 追加すると、最大トルクを生じる滑りが s1→s2 に推移）
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

const R2_SET: ReadonlyArray<number> = [0.2, 0.3, 0.5, 1];
const S1_SET: ReadonlyArray<number> = [0.03, 0.04, 0.05, 0.06];
const S2_SET: ReadonlyArray<number> = [0.1, 0.12, 0.15, 0.18, 0.2];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(r2: number, s1: number, s2: number): GenerationResult | null {
  if (r2 <= 0 || s1 <= 0 || s2 <= 0 || s2 <= s1) return null;
  const R = (r2 * (s2 - s1)) / s1;
  if (R <= 0 || !isCleanAnswer(R)) return null;
  const answerText = formatClean(R);

  return {
    format: "descriptive",
    params: {
      secondary_resistance: { value: r2, unit: "ohm", realistic_range: [0.1, 1] },
      slip_before: { value: s1, unit: "", realistic_range: [0.02, 0.08] },
      slip_after: { value: s2, unit: "", realistic_range: [0.1, 0.2] },
    },
    answerValue: R,
    answerUnit: "ohm",
    answerText,
    facts: { r2, s1, s2, R },
    defaultStatement:
      `巻線形三相誘導電動機の二次回路抵抗が r2=${r2}Ω のとき、最大トルクを生じる滑りは s1=${s1} である。` +
      `この滑りを s2=${s2} に推移させるために二次回路へ直列挿入する抵抗 R〔Ω〕を、比例推移の関係から求めよ。`,
    defaultSolution: [`比例推移: r2/s1=(r2+R)/s2`, `R=r2·(s2−s1)/s1=${r2}×(${s2}−${s1})/${s1}`, `R=${answerText}Ω`],
    physicallyValid: true,
  };
}

export const inductionProportionalShift: Template = {
  topic: "誘導電動機の比例推移",
  subject: "機械制御",
  exam: "denken2_secondary",
  difficulty: 4,
  paramSpecs: {
    secondary_resistance: { unit: "ohm", realistic_range: [0.1, 1] },
    slip_before: { unit: "", realistic_range: [0.02, 0.08] },
    slip_after: { unit: "", realistic_range: [0.1, 0.2] },
  },
  generate(rng) {
    return buildFrom(pick(R2_SET, rng), pick(S1_SET, rng), pick(S2_SET, rng));
  },
  generateFrom(params) {
    const { secondary_resistance, slip_before, slip_after } = params;
    if (secondary_resistance === undefined || slip_before === undefined || slip_after === undefined) {
      return null;
    }
    return buildFrom(secondary_resistance, slip_before, slip_after);
  },
};
