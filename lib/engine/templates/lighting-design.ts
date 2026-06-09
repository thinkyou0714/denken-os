/**
 * テンプレート: 照明設計（光束法）の必要灯数（機械・numeric）。
 *   N·F·U·M = E·A  ⇒  N = E·A / (F·U·M)   〔灯〕
 *     E=所要照度〔lx〕, A=面積〔m²〕, F=1灯の光束〔lm〕, U=照明率, M=保守率
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

const E_SET: ReadonlyArray<number> = [100, 200, 300, 500, 750, 1000];
const A_SET: ReadonlyArray<number> = [50, 100, 200];
const F_SET: ReadonlyArray<number> = [2000, 3000, 5000, 10000];
const U_SET: ReadonlyArray<number> = [0.4, 0.5, 0.6];
const M_SET: ReadonlyArray<number> = [0.7, 0.8];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(E: number, A: number, F: number, U: number, M: number): GenerationResult | null {
  if (E <= 0 || A <= 0 || F <= 0 || U <= 0 || U > 1 || M <= 0 || M > 1) return null;
  const N = (E * A) / (F * U * M);
  if (!isCleanAnswer(N) || N <= 0) return null;
  const answerText = formatClean(N);
  return {
    format: "numeric",
    params: {
      illuminance: { value: E, unit: "lx", realistic_range: [100, 1000] },
      area: { value: A, unit: "m2", realistic_range: [50, 200] },
      lumen: { value: F, unit: "lm", realistic_range: [2000, 10000] },
      utilization: { value: U, unit: "", realistic_range: [0.3, 0.7] },
      maintenance: { value: M, unit: "", realistic_range: [0.6, 0.9] },
    },
    answerValue: N,
    answerUnit: "灯",
    answerText,
    facts: { E, A, F, U, M, N },
    defaultStatement:
      `面積 A=${A}m² の室を所要照度 E=${E}lx で照らす。1灯の光束 F=${F}lm、照明率 U=${U}、保守率 M=${M} のとき、` +
      `必要な灯数 N は?（光束法 N·F·U·M=E·A）`,
    defaultSolution: [
      `光束法: 有効光束 N·F·U·M が必要光束 E·A に等しい`,
      `N=E·A/(F·U·M)=${E}×${A}/(${F}×${U}×${M})`,
      `N=${answerText}灯`,
    ],
    physicallyValid: true,
  };
}

export const lightingDesign: Template = {
  topic: "照明設計（光束法）",
  subject: "機械",
  exam: "denken2_primary",
  difficulty: 3,
  paramSpecs: {
    illuminance: { unit: "lx", realistic_range: [100, 1000] },
    area: { unit: "m2", realistic_range: [50, 200] },
    lumen: { unit: "lm", realistic_range: [2000, 10000] },
    utilization: { unit: "", realistic_range: [0.3, 0.7] },
    maintenance: { unit: "", realistic_range: [0.6, 0.9] },
  },
  generate(rng) {
    return buildFrom(pick(E_SET, rng), pick(A_SET, rng), pick(F_SET, rng), pick(U_SET, rng), pick(M_SET, rng));
  },
  generateFrom(params) {
    const { illuminance, area, lumen, utilization, maintenance } = params;
    if (
      illuminance === undefined ||
      area === undefined ||
      lumen === undefined ||
      utilization === undefined ||
      maintenance === undefined
    ) {
      return null;
    }
    return buildFrom(illuminance, area, lumen, utilization, maintenance);
  },
};
