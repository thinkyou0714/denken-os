/**
 * テンプレート: 単位換算（理論・numeric 形式）。
 *   接頭語(k/M/m)の換算 = 値 × 換算係数。電験は kW↔MW・Ω↔kΩ・A↔mA 等の
 *   桁(×1000/÷1000)を取り違える失点が多く、換算そのものを反復する導線を用意する。
 *
 * 決定論: 答えは (value, factor) だけで決まる純計算（answer = value × factor）。
 * これにより generateFrom({value, factor}) が generate() と同じ答えを再現する
 * （property.test の generate↔generateFrom 一致契約を満たす）。単位ラベルは出題文用で
 * 答えの数値には影響しない（E4: answer は単位なしの数値文字列）。
 */
import { isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

// value/ factor の宣言レンジ（DI-3: 出力 params の realistic_range と一致させる単一定義）。
const VALUE_RANGE: [number, number] = [0.1, 100_000];
const FACTOR_RANGE: [number, number] = [0.0001, 10_000];

/** 換算の族。values は結果が「綺麗な値」(<=2桁小数)になるよう厳選した離散集合。 */
interface Conversion {
  from: string;
  to: string;
  factor: number;
  quantity: string;
  values: number[];
}
const CONVERSIONS: Conversion[] = [
  { from: "MW", to: "kW", factor: 1000, quantity: "電力", values: [0.5, 1.2, 2.4, 3.6, 5, 7.5, 10, 24, 50] },
  { from: "kW", to: "W", factor: 1000, quantity: "電力", values: [0.4, 1.5, 2, 3.2, 4.5, 7.5, 10] },
  { from: "kΩ", to: "Ω", factor: 1000, quantity: "抵抗", values: [0.47, 1, 2.2, 4.7, 10, 22, 47] },
  { from: "MΩ", to: "kΩ", factor: 1000, quantity: "抵抗", values: [0.5, 1.2, 2, 4.7, 10] },
  { from: "A", to: "mA", factor: 1000, quantity: "電流", values: [0.5, 1.2, 2.5, 5, 10] },
  { from: "kV", to: "V", factor: 1000, quantity: "電圧", values: [3.3, 6.6, 11, 22, 66] },
  { from: "W", to: "kW", factor: 0.001, quantity: "電力", values: [500, 1200, 2400, 3600, 7500, 12_000, 50_000] },
  { from: "Ω", to: "kΩ", factor: 0.001, quantity: "抵抗", values: [470, 1200, 2200, 4700, 47_000] },
];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

/** factor から代表 conv を引く（generateFrom 用。答えの数値は conv に依存しない）。 */
function findConv(value: number, factor: number): Conversion | undefined {
  return (
    CONVERSIONS.find((c) => c.factor === factor && c.values.includes(value)) ??
    CONVERSIONS.find((c) => c.factor === factor)
  );
}

function buildFrom(value: number, factor: number, conv?: Conversion): GenerationResult | null {
  if (!Number.isFinite(value) || !Number.isFinite(factor) || factor <= 0) return null;
  if (value < VALUE_RANGE[0] || value > VALUE_RANGE[1]) return null;
  const result = value * factor;
  if (!isCleanAnswer(result)) return null; // 端数の出る換算は出題しない
  const answerText = String(Number(result.toFixed(2)));
  const c = conv ?? findConv(value, factor);
  const from = c?.from ?? "単位";
  const to = c?.to ?? "換算先";
  return {
    format: "numeric",
    params: {
      value: { value, unit: from, realistic_range: VALUE_RANGE },
      factor: { value: factor, unit: "", realistic_range: FACTOR_RANGE },
    },
    answerValue: result,
    answerUnit: to,
    answerText,
    facts: { value, factor, result },
    defaultStatement: `${value}${from} を ${to} に換算するといくらか（単位なしの数値で答えよ）。`,
    defaultSolution: [`1${from} = ${factor}${to}`, `${value}${from} = ${value} × ${factor}`, `= ${answerText} ${to}`],
    physicallyValid: true,
  };
}

export const unitConversion: Template = {
  topic: "単位換算",
  subject: "理論",
  exam: "denken3",
  difficulty: 1,
  paramSpecs: {
    value: { realistic_range: VALUE_RANGE },
    factor: { realistic_range: FACTOR_RANGE },
  },
  generate(rng) {
    const conv = pick(CONVERSIONS, rng);
    return buildFrom(pick(conv.values, rng), conv.factor, conv);
  },
  generateFrom(params) {
    const { value, factor } = params;
    if (value === undefined || factor === undefined) return null;
    return buildFrom(value, factor);
  },
};
