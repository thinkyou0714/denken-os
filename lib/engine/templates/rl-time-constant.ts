/**
 * テンプレート: RL直列回路の時定数（理論・numeric）。
 *   τ = L/R（電流は最終値の63.2%に τ で到達。RC の既存テンプレと対をなす）
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

const L_SET: ReadonlyArray<number> = [10, 20, 40, 50, 100, 200, 400, 500];
const R_SET: ReadonlyArray<number> = [2, 4, 5, 8, 10, 20, 25, 50];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(lMilliH: number, r: number): GenerationResult | null {
  if (lMilliH <= 0 || r <= 0) return null;
  const tau = lMilliH / r; // ms（L[mH]/R[Ω]）
  if (!isCleanAnswer(tau)) return null;
  const answerText = formatClean(tau);
  return {
    format: "numeric",
    params: {
      inductance: { value: lMilliH, unit: "mH", realistic_range: [1, 1000] },
      resistance: { value: r, unit: "Ω", realistic_range: [1, 100] },
    },
    answerValue: tau,
    answerUnit: "ms",
    answerText,
    facts: { lMilliH, r, tau },
    defaultStatement:
      `インダクタンス ${formatClean(lMilliH)}mH のコイルと抵抗 ${formatClean(r)}Ω を直列に接続し、` +
      `直流電圧を加えた。この回路の時定数〔ms〕は?`,
    defaultSolution: [
      `RL直列回路の時定数 τ=L/R（τ で電流は最終値の約63.2%）`,
      `=${formatClean(lMilliH)}×10⁻³/${formatClean(r)} 〔s〕`,
      `=${answerText}ms`,
    ],
    physicallyValid: true,
  };
}

export const rlTimeConstant: Template = {
  topic: "RL回路の時定数",
  subject: "理論",
  exam: "denken2_primary",
  difficulty: 2,
  paramSpecs: {
    inductance: { unit: "mH", realistic_range: [1, 1000] },
    resistance: { unit: "Ω", realistic_range: [1, 100] },
  },
  generate(rng) {
    return buildFrom(pick(L_SET, rng), pick(R_SET, rng));
  },
  generateFrom(params) {
    const { inductance, resistance } = params;
    if (inductance === undefined || resistance === undefined) return null;
    return buildFrom(inductance, resistance);
  },
};
