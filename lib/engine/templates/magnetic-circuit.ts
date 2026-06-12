/**
 * テンプレート: 磁気回路の磁束（理論・numeric）。
 *   起磁力 F = N·I〔A〕,  磁束 Φ = F/Rm = N·I/Rm〔Wb〕（Rm: 磁気抵抗〔H⁻¹〕）
 *   電気回路のオームの法則とのアナロジー（起磁力↔起電力・磁束↔電流・磁気抵抗↔抵抗）。
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { pick } from "./helpers.js";
import type { GenerationResult, Template } from "./types.js";

const N_SET: ReadonlyArray<number> = [100, 200, 250, 400, 500, 800, 1000];
const I_SET: ReadonlyArray<number> = [0.5, 1, 2, 2.5, 4, 5];
const RM_SET: ReadonlyArray<number> = [1e6, 2e6, 2.5e6, 4e6, 5e6, 1e7];

function buildFrom(n: number, i: number, rm: number): GenerationResult | null {
  if (n <= 0 || i <= 0 || rm <= 0) return null;
  const mmf = n * i;
  const fluxMilliWb = (mmf / rm) * 1000; // mWb
  if (!isCleanAnswer(fluxMilliWb)) return null;
  const answerText = formatClean(fluxMilliWb);
  return {
    format: "numeric",
    params: {
      turns: { value: n, realistic_range: [50, 2000] },
      current: { value: i, unit: "A", realistic_range: [0.1, 10] },
      reluctance: { value: rm, unit: "H^-1", realistic_range: [1e5, 1e8] },
    },
    answerValue: fluxMilliWb,
    answerUnit: "mWb",
    answerText,
    facts: { n, i, rm, mmf, fluxMilliWb },
    defaultStatement:
      `巻数 ${formatClean(n)} のコイルに電流 ${formatClean(i)}A を流す。磁気回路の磁気抵抗が ` +
      `${rm.toExponential(1)}H⁻¹ のとき、磁気回路を通る磁束〔mWb〕は?`,
    defaultSolution: [
      `起磁力 F=N·I=${formatClean(n)}×${formatClean(i)}=${formatClean(mmf)}A`,
      `磁束 Φ=F/Rm（電気回路のオームの法則とのアナロジー）`,
      `=${formatClean(mmf)}/${rm.toExponential(1)} 〔Wb〕 =${answerText}mWb`,
    ],
    physicallyValid: true,
  };
}

export const magneticCircuit: Template = {
  topic: "磁気回路の磁束",
  subject: "理論",
  exam: "denken2_primary",
  difficulty: 3,
  paramSpecs: {
    turns: { realistic_range: [50, 2000] },
    current: { unit: "A", realistic_range: [0.1, 10] },
    reluctance: { unit: "H^-1", realistic_range: [1e5, 1e8] },
  },
  generate(rng) {
    return buildFrom(pick(N_SET, rng), pick(I_SET, rng), pick(RM_SET, rng));
  },
  generateFrom(params) {
    const { turns, current, reluctance } = params;
    if (turns === undefined || current === undefined || reluctance === undefined) return null;
    return buildFrom(turns, current, reluctance);
  },
};
