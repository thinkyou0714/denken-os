/**
 * テンプレート: 単相全波整流の直流電圧（機械・numeric）。
 *   平均直流電圧（近似）  Vd ≈ 0.9 · V   〔V〕（V=交流電源の実効値）
 *   （正確には Vd=2√2·V/π≈0.9V。電験の頻出近似値）
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

const V_SET: ReadonlyArray<number> = [100, 110, 200, 220, 400, 1000];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(V: number): GenerationResult | null {
  if (V <= 0) return null;
  const Vd = 0.9 * V;
  if (!isCleanAnswer(Vd)) return null;
  const answerText = formatClean(Vd);
  return {
    format: "numeric",
    params: {
      ac_voltage: { value: V, unit: "V", realistic_range: [100, 1000] },
    },
    answerValue: Vd,
    answerUnit: "V",
    answerText,
    facts: { V, Vd },
    defaultStatement: `実効値 V=${V}V の交流を単相全波整流する。平均直流電圧 Vd〔V〕を近似式 Vd≈0.9V により求めよ。`,
    defaultSolution: [`単相全波整流の平均直流電圧 Vd=2√2·V/π≈0.9·V`, `Vd=0.9×${V}`, `Vd=${answerText}V`],
    physicallyValid: true,
  };
}

export const fullWaveRectifier: Template = {
  topic: "単相全波整流の直流電圧",
  subject: "機械",
  exam: "denken2_primary",
  difficulty: 2,
  paramSpecs: {
    ac_voltage: { unit: "V", realistic_range: [100, 1000] },
  },
  generate(rng) {
    return buildFrom(pick(V_SET, rng));
  },
  generateFrom(params) {
    const { ac_voltage } = params;
    if (ac_voltage === undefined) return null;
    return buildFrom(ac_voltage);
  },
};
