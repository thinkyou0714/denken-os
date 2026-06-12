/**
 * テンプレート: 変圧器の電圧変動率（二種二次・記述/計算 = descriptive 形式）。
 *   一次近似 ε ≈ p·cosθ + q·sinθ 〔%〕
 *     p = %抵抗降下, q = %リアクタンス降下, cosθ = 負荷力率(遅れ)
 * 二次は自動採点しない（format=descriptive・自己採点）。正解値はコードで算出。
 */
import { isCleanAnswer } from "../clean.js";
import { pick } from "./helpers.js";
import type { GenerationResult, Template } from "./types.js";

const P_SET = [1, 2, 3, 4];
const Q_SET = [4, 5, 6, 8, 10];
// cosθ と sinθ が共に綺麗になる力率（遅れ）。
const PF: ReadonlyArray<readonly [number, number]> = [
  [0.8, 0.6],
  [0.6, 0.8],
  [1.0, 0.0],
];

function buildFrom(p: number, q: number, cos: number, sin: number): GenerationResult | null {
  if (p <= 0 || q <= 0 || cos <= 0 || cos > 1) return null;
  const eps = p * cos + q * sin; // 一次近似の電圧変動率(%)
  if (!isCleanAnswer(eps)) return null;
  const answerText = String(Number(eps.toFixed(2)));

  return {
    format: "descriptive",
    params: {
      percent_resistance: { value: p, unit: "%", realistic_range: [1, 5] },
      percent_reactance: { value: q, unit: "%", realistic_range: [2, 15] },
      power_factor: { value: cos, unit: "", realistic_range: [0.5, 1] },
    },
    answerValue: eps,
    answerUnit: "%",
    answerText,
    facts: { p, q, cos, sin, eps },
    defaultStatement:
      `定格運転中の変圧器で、%抵抗降下 p=${p}%、%リアクタンス降下 q=${q}%、` +
      `負荷力率 cosθ=${cos}（遅れ）である。電圧変動率 ε〔%〕を一次近似 ` +
      `ε≈p·cosθ+q·sinθ により求め、導出過程とともに示せ。`,
    defaultSolution: [
      `sinθ=√(1−cos²θ)=√(1−${cos}²)=${sin}`,
      `ε≈p·cosθ+q·sinθ=${p}×${cos}+${q}×${sin}`,
      `ε=${answerText}%`,
      `（補足: 二次項 (q·cosθ−p·sinθ)²/200 を含む厳密式もあるが、本問は一次近似で評価）`,
    ],
    physicallyValid: true,
  };
}

export const transformerVoltageRegulation: Template = {
  topic: "変圧器の電圧変動率",
  subject: "機械制御",
  exam: "denken2_secondary",
  difficulty: 3,
  paramSpecs: {
    percent_resistance: { unit: "%", realistic_range: [1, 5] },
    percent_reactance: { unit: "%", realistic_range: [2, 15] },
    power_factor: { unit: "", realistic_range: [0.5, 1] },
  },
  generate(rng) {
    const [cos, sin] = pick(PF, rng);
    return buildFrom(pick(P_SET, rng), pick(Q_SET, rng), cos, sin);
  },
  generateFrom(params) {
    const { percent_resistance, percent_reactance, power_factor } = params;
    if (percent_resistance === undefined || percent_reactance === undefined || power_factor === undefined) {
      return null;
    }
    const sin = Number(Math.sqrt(1 - power_factor * power_factor).toFixed(4));
    return buildFrom(percent_resistance, percent_reactance, power_factor, sin);
  },
};
