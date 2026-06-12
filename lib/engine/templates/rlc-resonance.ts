/**
 * テンプレート: RLC直列回路の共振角周波数（理論・numeric）。
 *   共振条件 ωL = 1/(ωC) ⇒ ω0 = 1/√(LC)〔rad/s〕（共振時のインピーダンスは R のみ）
 *   L〔mH〕×C〔μF〕の積が「平方数×10^偶数」になる組だけ採用し、ω0 を綺麗な値にする。
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { pick } from "./helpers.js";
import type { GenerationResult, Template } from "./types.js";

/** (L mH, C μF) — L·C ∈ {250, 1000, 4000, 16000} ⇒ ω0 ∈ {2000, 1000, 500, 250} rad/s。 */
const LC_PAIRS: ReadonlyArray<readonly [number, number]> = [
  [10, 25],
  [25, 10],
  [5, 50],
  [50, 5],
  [10, 100],
  [100, 10],
  [20, 50],
  [40, 25],
  [40, 100],
  [100, 40],
  [80, 50],
  [200, 20],
  [160, 100],
  [400, 40],
  [200, 80],
];

function buildFrom(lMilliH: number, cMicroF: number): GenerationResult | null {
  if (lMilliH <= 0 || cMicroF <= 0) return null;
  const lc = lMilliH * 1e-3 * (cMicroF * 1e-6); // SI
  const omega = 1 / Math.sqrt(lc);
  if (!isCleanAnswer(omega)) return null;
  const answerText = formatClean(omega);
  return {
    format: "numeric",
    params: {
      inductance: { value: lMilliH, unit: "mH", realistic_range: [1, 500] },
      capacitance: { value: cMicroF, unit: "μF", realistic_range: [1, 200] },
    },
    answerValue: omega,
    answerUnit: "rad/s",
    answerText,
    facts: { lMilliH, cMicroF, omega },
    defaultStatement:
      `R、L=${formatClean(lMilliH)}mH、C=${formatClean(cMicroF)}μF を直列に接続した回路がある。` +
      `この回路が共振する角周波数 ω0〔rad/s〕は?`,
    defaultSolution: [
      `共振条件 ωL=1/(ωC) より ω0=1/√(LC)（このときインピーダンスは R のみ）`,
      `LC=${formatClean(lMilliH)}×10⁻³×${formatClean(cMicroF)}×10⁻⁶=${lc.toExponential(1)}`,
      `ω0=1/√(LC)=${answerText}rad/s`,
    ],
    physicallyValid: true,
  };
}

export const rlcResonance: Template = {
  topic: "RLC直列回路の共振",
  subject: "理論",
  exam: "denken2_primary",
  difficulty: 3,
  paramSpecs: {
    inductance: { unit: "mH", realistic_range: [1, 500] },
    capacitance: { unit: "μF", realistic_range: [1, 200] },
  },
  generate(rng) {
    const [l, c] = pick(LC_PAIRS, rng);
    return buildFrom(l, c);
  },
  generateFrom(params) {
    const { inductance, capacitance } = params;
    if (inductance === undefined || capacitance === undefined) return null;
    return buildFrom(inductance, capacitance);
  },
};
