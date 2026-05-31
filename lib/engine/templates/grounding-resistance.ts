/**
 * テンプレート: B種接地工事の接地抵抗（法規・numeric 形式）。
 *   基本式 R = 150 / Ig 〔Ω〕   (Ig = 1線地絡電流〔A〕)
 *   ※緩和: 高圧電路を1〜2秒で遮断する装置があれば 300/Ig、1秒以内なら 600/Ig。
 * 正解はコードで算出（出典: 電気設備技術基準・電験法規の標準式）。
 */
import { isCleanAnswer } from "../clean.js";
import { gradingTolerance } from "../quality.js";
import type { GenerationResult, Template } from "./types.js";

// 150/Ig が綺麗な値になる 1線地絡電流〔A〕。
const IG_SET = [2, 3, 5, 6, 10, 15, 25, 30];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(ig: number): GenerationResult | null {
  if (ig <= 0) return null;
  const R = 150 / ig;
  if (!isCleanAnswer(R)) return null;
  const answerText = String(Number(R.toFixed(2)));
  return {
    format: "numeric",
    params: { ground_fault_current: { value: ig, unit: "A", realistic_range: [1, 30] } },
    answerValue: R,
    answerUnit: "Ω",
    answerText,
    numericTolerance: gradingTolerance(R),
    facts: { Ig: ig, R },
    defaultStatement:
      `高圧電路の1線地絡電流が${ig}Aである。` + `B種接地工事の接地抵抗の最大値〔Ω〕を、基本式 R=150/Ig により求めよ。`,
    defaultSolution: [
      "B種接地抵抗の基本式: R = 150 / Ig",
      `R = 150 / ${ig} = ${answerText}Ω`,
      "（参考: 高圧電路を1〜2秒で自動遮断する装置があれば300/Ig、1秒以内なら600/Ig まで緩和される）",
    ],
    physicallyValid: true,
  };
}

export const groundingResistance: Template = {
  topic: "B種接地抵抗",
  subject: "法規",
  exam: "denken3",
  difficulty: 2,
  paramSpecs: { ground_fault_current: { unit: "A", realistic_range: [1, 30] } },
  generate(rng) {
    return buildFrom(pick(IG_SET, rng));
  },
  generateFrom(params) {
    const ig = params.ground_fault_current;
    if (ig === undefined) return null;
    return buildFrom(ig);
  },
};
