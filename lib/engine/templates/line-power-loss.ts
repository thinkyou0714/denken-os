/**
 * テンプレート: 三相線路の電力損失（電力・numeric 形式）。
 *   電力損失 P_loss〔W〕 = 3 × I² × R   （I=線電流, R=1線あたりの抵抗）
 * 三相3線式送配電線の銅損の基本式。正解はコードで算出し、綺麗な値になる組のみ採用する。
 *
 * 決定論: 答えは (I, R) だけで決まる純計算なので generateFrom が generate を再現する。
 */
import { isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

const CURRENT = [5, 10, 20]; // 線電流 A
const RESISTANCE = [0.1, 0.2, 0.3, 0.5]; // 1線あたりの抵抗 Ω

const I_RANGE: [number, number] = [1, 1000];
const R_RANGE: [number, number] = [0.01, 100];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(i: number, r: number): GenerationResult | null {
  if (![i, r].every((x) => Number.isFinite(x) && x > 0)) return null;
  const loss = 3 * i * i * r; // 三相3線式の銅損
  if (!isCleanAnswer(loss)) return null;
  const answerText = String(Number(loss.toFixed(2)));
  return {
    format: "numeric",
    params: {
      line_current: { value: i, unit: "A", realistic_range: I_RANGE },
      resistance: { value: r, unit: "Ω", realistic_range: R_RANGE },
    },
    answerValue: loss,
    answerUnit: "W",
    answerText,
    facts: { i, r, loss },
    defaultStatement:
      `三相3線式送電線に線電流${i}A が流れている。1線あたりの抵抗が${r}Ω のとき、` +
      `線路の電力損失〔W〕を求めよ。`,
    defaultSolution: ["三相3線式の電力損失 = 3 × I² × R", `= 3 × ${i}² × ${r}`, `= ${answerText} W`],
    physicallyValid: true,
  };
}

export const linePowerLoss: Template = {
  topic: "三相線路の電力損失",
  subject: "電力",
  exam: "denken3",
  difficulty: 2,
  paramSpecs: {
    line_current: { unit: "A", realistic_range: I_RANGE },
    resistance: { unit: "Ω", realistic_range: R_RANGE },
  },
  generate(rng) {
    return buildFrom(pick(CURRENT, rng), pick(RESISTANCE, rng));
  },
  generateFrom(params) {
    const { line_current, resistance } = params;
    if (line_current === undefined || resistance === undefined) return null;
    return buildFrom(line_current, resistance);
  },
};
