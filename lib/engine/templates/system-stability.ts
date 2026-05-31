/**
 * テンプレート: 電力系統の定態安定極限電力（電験二種二次「電力・管理」）。
 *
 * 閉形式: P_max = V_s·V_r/X   〔pu〕   （δ=90° で最大。これを超えると脱調）
 *
 * descriptive 形式。正解値はコードで算出。
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

// [V_s, V_r, X (pu)]。P_max が綺麗な組。
const SETS: ReadonlyArray<readonly [number, number, number]> = [
  [1.0, 1.0, 0.5],
  [1.0, 1.0, 0.4],
  [1.05, 1.0, 0.5],
  [1.0, 0.9, 0.6],
  [1.1, 1.0, 0.5],
  [1.0, 1.0, 0.8],
  [1.2, 1.0, 0.6],
  [1.0, 0.8, 0.4],
];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(Vs: number, Vr: number, X: number): GenerationResult | null {
  if (Vs <= 0 || Vr <= 0 || X <= 0) return null;
  const Pmax = (Vs * Vr) / X; // 正解
  if (!isCleanAnswer(Pmax)) return null;
  const answerText = formatClean(Pmax);

  return {
    format: "descriptive",
    params: {
      sending_voltage_pu: { value: Vs, unit: "pu", realistic_range: [0.8, 1.3] },
      receiving_voltage_pu: { value: Vr, unit: "pu", realistic_range: [0.8, 1.3] },
      reactance_pu: { value: X, unit: "pu", realistic_range: [0.2, 1.5] },
    },
    answerValue: Pmax,
    answerUnit: "pu",
    answerText,
    facts: { Vs, Vr, X, Pmax },
    defaultStatement:
      `送電端電圧 V_s=${Vs}pu、受電端電圧 V_r=${Vr}pu、線路リアクタンス X=${X}pu の系統がある。` +
      `定態安定極限電力 P_max〔pu〕を、相差角 δ との関係を示しつつ求めよ。`,
    defaultSolution: [
      `送電電力は P=(V_s·V_r/X)·sin δ`,
      `δ=90° で最大となり P_max = V_s·V_r/X = ${Vs}×${Vr}/${X}`,
      `P_max = ${answerText} pu（これを超えると同期外れ＝脱調）`,
    ],
    physicallyValid: true,
  };
}

export const systemStability: Template = {
  topic: "電力系統の安定度",
  subject: "電力管理",
  exam: "denken2_secondary",
  difficulty: 4,
  meta: {
    tags: ["電力管理", "二次試験", "安定度", "電力動揺"],
    formulas: ["P=(V_s·V_r/X)sin δ", "P_max=V_s·V_r/X（δ=90°）", "同期化力 dP/dδ"],
    learningObjectives: ["定態安定極限電力を求め、相差角と脱調の関係を説明できる"],
    hints: ["出力は sin δ に比例", "δ=90° で最大＝安定限界", "リアクタンス低減で安定度向上"],
    prerequisites: ["同期発電機の出力・短絡比", "三相交流電力"],
    relatedTopics: ["同期機の出力と安定度", "調相設備"],
    estimatedTimeSec: 540,
    cognitiveLevel: "analyze",
    gradingPoints: [
      "P=(V_sV_r/X)sin δ の電力角式を提示（3点）",
      "δ=90° で最大となることを説明（2点）",
      "P_max=V_sV_r/X を正しく計算（3点）",
      "安定限界・脱調の意味に言及（1点）",
    ],
    references: [{ label: "電力系統の定態・過渡安定度", article: "電力・管理（二次）頻出テーマ" }],
  },
  paramSpecs: {
    sending_voltage_pu: { unit: "pu", realistic_range: [0.8, 1.3] },
    receiving_voltage_pu: { unit: "pu", realistic_range: [0.8, 1.3] },
    reactance_pu: { unit: "pu", realistic_range: [0.2, 1.5] },
  },
  generate(rng) {
    const [Vs, Vr, X] = pick(SETS, rng);
    return buildFrom(Vs, Vr, X);
  },
  generateFrom(params) {
    const { sending_voltage_pu, receiving_voltage_pu, reactance_pu } = params;
    if (sending_voltage_pu === undefined || receiving_voltage_pu === undefined || reactance_pu === undefined)
      return null;
    return buildFrom(sending_voltage_pu, receiving_voltage_pu, reactance_pu);
  },
};
