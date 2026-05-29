/**
 * テンプレート: 力率改善に必要なコンデンサ容量（電力・numeric 形式）。
 *   Qc = P·(tanθ1 − tanθ2)  〔kvar〕
 *     P=有効電力, θ1=改善前力率角, θ2=改善後力率角
 * 力率は (cos, tan が綺麗な) 組み合わせのみ採用。正解はコードで算出。
 */
import { isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

const P_SET = [50, 100, 150, 200, 300]; // 有効電力 kW
// [力率, tanθ] が綺麗な組（cosθ → tanθ）。
const PF: ReadonlyArray<readonly [number, number]> = [
  [0.6, 4 / 3],
  [0.8, 3 / 4],
  [1.0, 0],
];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(P: number, cos1: number, tan1: number, cos2: number, tan2: number): GenerationResult | null {
  if (P <= 0 || cos1 <= 0 || cos2 <= 0 || cos2 < cos1) return null; // 改善後は力率が良く(>=)なる
  const Qc = P * (tan1 - tan2); // 必要コンデンサ容量 kvar
  if (Qc <= 0 || !isCleanAnswer(Qc)) return null;
  const answerText = String(Number(Qc.toFixed(2)));

  return {
    format: "numeric",
    difficulty: cos2 === 1 ? 2 : 3,
    params: {
      active_power: { value: P, unit: "kW", realistic_range: [10, 1000] },
      pf_before: { value: cos1, unit: "", realistic_range: [0.5, 1] },
      pf_after: { value: cos2, unit: "", realistic_range: [0.5, 1] },
    },
    answerValue: Qc,
    answerUnit: "kvar",
    answerText,
    facts: { P, cos1, cos2, Qc },
    defaultStatement:
      `有効電力${P}kW、力率cosθ₁=${cos1}（遅れ）の負荷の力率を${cos2}に改善したい。` +
      `必要なコンデンサ容量Qc〔kvar〕を求めよ。`,
    defaultSolution: [
      "Qc = P·(tanθ₁ − tanθ₂)",
      `tanθ₁=${Number(tan1.toFixed(4))}、tanθ₂=${Number(tan2.toFixed(4))}`,
      `Qc = ${P}×(${Number(tan1.toFixed(4))} − ${Number(tan2.toFixed(4))})`,
      `Qc = ${answerText} kvar`,
    ],
    physicallyValid: true,
  };
}

export const powerFactorCorrection: Template = {
  topic: "力率改善とコンデンサ容量",
  subject: "電力",
  exam: "denken2_primary",
  difficulty: 3,
  paramSpecs: {
    active_power: { unit: "kW", realistic_range: [10, 1000] },
    pf_before: { unit: "", realistic_range: [0.5, 1] },
    pf_after: { unit: "", realistic_range: [0.5, 1] },
  },
  generate(rng) {
    const P = pick(P_SET, rng);
    const [cos1, tan1] = pick(PF, rng);
    const [cos2, tan2] = pick(PF, rng);
    return buildFrom(P, cos1, tan1, cos2, tan2);
  },
  generateFrom(params) {
    const { active_power, pf_before, pf_after } = params;
    if (active_power === undefined || pf_before === undefined || pf_after === undefined) return null;
    const tanOf = (cos: number) => (cos >= 1 ? 0 : Math.sqrt(1 - cos * cos) / cos);
    return buildFrom(active_power, pf_before, tanOf(pf_before), pf_after, tanOf(pf_after));
  },
};
