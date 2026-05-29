/**
 * テンプレート: 低圧電路の絶縁抵抗の最小値（法規・numeric 形式）。
 *   電気設備技術基準 省令58条の区分:
 *     対地電圧 150V 以下         → 0.1 MΩ
 *     150V 超 300V 以下          → 0.2 MΩ
 *     300V 超（使用電圧）        → 0.4 MΩ
 * 正解はコード（区分テーブル）で決定。暗記比重が高く、音声学習(聞き流し)に好適。
 * 二種一次・三種いずれの法規でも頻出のため exam=二種一次として収録。
 */
import { isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

// 区分が分かれるよう、各帯から代表的な対地電圧をサンプリングする。
const VOLTAGES = [100, 105, 150, 200, 210, 250, 300, 400, 440];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

/** 対地電圧 → 絶縁抵抗の最小値〔MΩ〕（省令58条の区分）。 */
function minInsulationMegaohm(voltage: number): number {
  if (voltage <= 150) return 0.1;
  if (voltage <= 300) return 0.2;
  return 0.4;
}

function buildFrom(voltage: number): GenerationResult | null {
  if (voltage <= 0) return null;
  const R = minInsulationMegaohm(voltage);
  if (!isCleanAnswer(R)) return null;
  const answerText = String(Number(R.toFixed(2)));
  const band = voltage <= 150 ? "150V以下" : voltage <= 300 ? "150Vを超え300V以下" : "300Vを超える";

  return {
    format: "numeric",
    difficulty: 1,
    params: { voltage: { value: voltage, unit: "V", realistic_range: [50, 600] } },
    answerValue: R,
    answerUnit: "MΩ",
    answerText,
    facts: { voltage, R, band },
    defaultStatement:
      `対地電圧${voltage}Vの低圧電路がある。電気設備技術基準（省令第58条）で定める` +
      `絶縁抵抗の最小値〔MΩ〕を求めよ。`,
    defaultSolution: [
      "省令58条の区分: 対地電圧150V以下=0.1MΩ、150V超300V以下=0.2MΩ、300V超=0.4MΩ",
      `対地電圧${voltage}Vは「${band}」に該当`,
      `絶縁抵抗の最小値 = ${answerText}MΩ`,
    ],
    physicallyValid: true,
  };
}

export const insulationResistance: Template = {
  topic: "低圧電路の絶縁抵抗",
  subject: "法規",
  exam: "denken2_primary",
  difficulty: 1,
  paramSpecs: { voltage: { unit: "V", realistic_range: [50, 600] } },
  generate(rng) {
    return buildFrom(pick(VOLTAGES, rng));
  },
  generateFrom(params) {
    const v = params.voltage;
    if (v === undefined) return null;
    return buildFrom(v);
  },
};
