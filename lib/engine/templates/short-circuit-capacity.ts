/**
 * テンプレート: 三相短絡容量（電力管理・numeric 形式）。
 *   短絡容量 Ps〔MVA〕 = 基準容量 Pn × 100 / %Z
 * 電力管理(二次)の定番。パーセントインピーダンス %Z と基準容量 Pn から、その点の
 * 三相短絡容量を求める。正解はコードで算出し、整数になる組だけ採用する。
 *
 * 決定論: 答えは (Pn, %Z) だけで決まる純計算なので generateFrom が generate を再現する。
 */
import { isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

// 宣言レンジ（DI-3: 出力 params.realistic_range と一致させる単一定義）。
const PN_RANGE: [number, number] = [1, 1000];
const Z_RANGE: [number, number] = [0.1, 100];

// 結果 Ps=Pn×100/%Z が必ず整数になる組み合わせのみ（歩留まり100%・clean 保証）。
const BASE_MVA = [10, 20, 50, 100];
const PERCENT_Z = [4, 5, 8, 10, 20, 25];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(pnMva: number, zPct: number): GenerationResult | null {
  if (!Number.isFinite(pnMva) || !Number.isFinite(zPct) || zPct <= 0) return null;
  if (pnMva < PN_RANGE[0] || pnMva > PN_RANGE[1]) return null;
  if (zPct < Z_RANGE[0] || zPct > Z_RANGE[1]) return null;
  const ps = (pnMva * 100) / zPct; // 短絡容量〔MVA〕
  if (!isCleanAnswer(ps)) return null; // 端数の出る組は出題しない
  const answerText = String(Number(ps.toFixed(2)));
  return {
    format: "numeric",
    params: {
      base_capacity: { value: pnMva, unit: "MVA", realistic_range: PN_RANGE },
      percent_impedance: { value: zPct, unit: "%", realistic_range: Z_RANGE },
    },
    answerValue: ps,
    answerUnit: "MVA",
    answerText,
    facts: { pnMva, zPct, ps },
    defaultStatement:
      `基準容量${pnMva}MVA の系統で、ある点から電源側を見たパーセントインピーダンスが${zPct}%である。` +
      `この点の三相短絡容量〔MVA〕を求めよ。`,
    defaultSolution: ["短絡容量 Ps = 基準容量 × 100 / %Z", `= ${pnMva} × 100 / ${zPct}`, `= ${answerText} MVA`],
    physicallyValid: true,
  };
}

export const shortCircuitCapacity: Template = {
  topic: "短絡容量",
  subject: "電力管理",
  exam: "denken2_secondary",
  difficulty: 2,
  paramSpecs: {
    base_capacity: { unit: "MVA", realistic_range: PN_RANGE },
    percent_impedance: { unit: "%", realistic_range: Z_RANGE },
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
