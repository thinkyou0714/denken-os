/**
 * テンプレート: パーセントインピーダンスと短絡容量（電力管理・numeric 形式）。
 *   短絡容量 Ps = 基準容量 Pn × 100 / %Z   〔MVA〕
 * 二種二次「電力管理」の頻出計算。正解はコードで算出。
 * （√3 を含む短絡電流ではなく短絡容量にすることで、答えが常に綺麗になる組を採れる）
 */
import { isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

const BASE_MVA = [10, 20, 30, 50, 100]; // 基準容量 [MVA]
const PERCENT_Z = [5, 8, 10, 12.5, 16, 20, 25]; // パーセントインピーダンス [%]

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(baseMVA: number, percentZ: number): GenerationResult | null {
  if (baseMVA <= 0 || percentZ <= 0) return null;
  const Ps = (baseMVA * 100) / percentZ; // 短絡容量 [MVA]
  if (!isCleanAnswer(Ps)) return null;
  const answerText = String(Number(Ps.toFixed(2)));

  // %Z が小さいほど短絡容量が大きく、保護協調の判断が難しくなる → 難度を上げる。
  const difficulty = percentZ <= 8 ? 3 : 2;

  return {
    format: "numeric",
    difficulty,
    params: {
      base_capacity: { value: baseMVA, unit: "MVA", realistic_range: [1, 1000] },
      percent_impedance: { value: percentZ, unit: "%", realistic_range: [1, 50] },
    },
    answerValue: Ps,
    answerUnit: "MVA",
    answerText,
    facts: { baseMVA, percentZ, Ps },
    defaultStatement:
      `基準容量${baseMVA}MVA、パーセントインピーダンス%Z=${percentZ}%の系統がある。` +
      `この点での三相短絡容量Ps〔MVA〕を求めよ。`,
    defaultSolution: [
      "短絡容量 Ps = 基準容量 × 100 / %Z",
      `Ps = ${baseMVA} × 100 / ${percentZ}`,
      `Ps = ${answerText} MVA`,
      "（短絡電流 Is が必要なら Is = Ps / (√3·V) で基準電圧 V から換算する）",
    ],
    physicallyValid: true,
  };
}

export const shortCircuitCapacity: Template = {
  topic: "パーセントインピーダンスと短絡容量",
  subject: "電力管理",
  exam: "denken2_secondary",
  difficulty: 3,
  paramSpecs: {
    base_capacity: { unit: "MVA", realistic_range: [1, 1000] },
    percent_impedance: { unit: "%", realistic_range: [1, 50] },
  },
  generate(rng) {
    return buildFrom(pick(BASE_MVA, rng), pick(PERCENT_Z, rng));
  },
  generateFrom(params) {
    const { base_capacity, percent_impedance } = params;
    if (base_capacity === undefined || percent_impedance === undefined) return null;
    return buildFrom(base_capacity, percent_impedance);
  },
};
