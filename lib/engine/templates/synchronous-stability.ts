/**
 * テンプレート: 同期機の出力と定態安定極限（電験二種二次「機械・制御」）。
 *
 * 閉形式: P_max = V·E/X_s   〔pu〕   （δ=90° で最大。これを超えると同期外れ）
 *
 * descriptive 形式。正解値はコードで算出。
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

// [V, E, X_s (pu)]。P_max が綺麗な組。
const SETS: ReadonlyArray<readonly [number, number, number]> = [
  [1.0, 1.5, 0.6],
  [1.0, 1.2, 0.6],
  [1.0, 1.5, 0.5],
  [1.0, 1.6, 0.8],
  [1.0, 2.0, 0.8],
  [1.0, 1.8, 0.6],
  [1.0, 1.0, 0.5],
  [1.0, 2.4, 0.8],
];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(V: number, E: number, Xs: number): GenerationResult | null {
  if (V <= 0 || E <= 0 || Xs <= 0) return null;
  const Pmax = (V * E) / Xs; // 正解
  if (!isCleanAnswer(Pmax)) return null;
  const answerText = formatClean(Pmax);

  return {
    format: "descriptive",
    params: {
      terminal_voltage_pu: { value: V, unit: "pu", realistic_range: [0.8, 1.3] },
      induced_voltage_pu: { value: E, unit: "pu", realistic_range: [0.8, 3.0] },
      reactance_pu: { value: Xs, unit: "pu", realistic_range: [0.2, 1.5] },
    },
    answerValue: Pmax,
    answerUnit: "pu",
    answerText,
    facts: { V, E, Xs, Pmax },
    defaultStatement:
      `端子電圧 V=${V}pu、誘導起電力 E=${E}pu、同期リアクタンス X_s=${Xs}pu の同期発電機がある。` +
      `この機の出力の理論最大値（定態安定極限）P_max〔pu〕を、負荷角 δ との関係を示して求めよ。`,
    defaultSolution: [
      `出力 P = (V·E/X_s)·sin δ`,
      `δ=90° で最大 P_max = V·E/X_s = ${V}×${E}/${Xs}`,
      `P_max = ${answerText} pu（δ がこれを超えると同期外れ＝脱調）`,
    ],
    physicallyValid: true,
  };
}

export const synchronousStability: Template = {
  topic: "同期機の出力と安定度",
  subject: "機械制御",
  exam: "denken2_secondary",
  difficulty: 4,
  meta: {
    tags: ["機械制御", "二次試験", "同期機", "安定度", "電力角"],
    formulas: ["P=(V·E/X_s)sin δ", "P_max=V·E/X_s（δ=90°）", "同期化力 P_s=dP/dδ"],
    learningObjectives: ["同期機の電力角特性から定態安定極限を求め、脱調を説明できる"],
    hints: ["出力は sin δ に比例", "δ=90° で最大＝安定限界", "X_s が小さいほど安定"],
    prerequisites: ["同期発電機の出力・短絡比", "同期速度"],
    relatedTopics: ["電力系統の安定度", "同期発電機の出力・短絡比"],
    estimatedTimeSec: 540,
    cognitiveLevel: "analyze",
    gradingPoints: [
      "電力角式 P=(V·E/X_s)sin δ を提示（3点）",
      "δ=90° で最大となることを説明（2点）",
      "P_max=V·E/X_s を正しく計算（3点）",
      "脱調（同期外れ）の意味に言及（1点）",
    ],
    references: [{ label: "同期機の出力特性と安定度", article: "機械・制御（二次）頻出テーマ" }],
  },
  paramSpecs: {
    terminal_voltage_pu: { unit: "pu", realistic_range: [0.8, 1.3] },
    induced_voltage_pu: { unit: "pu", realistic_range: [0.8, 3.0] },
    reactance_pu: { unit: "pu", realistic_range: [0.2, 1.5] },
  },
  generate(rng) {
    const [V, E, Xs] = pick(SETS, rng);
    return buildFrom(V, E, Xs);
  },
  generateFrom(params) {
    const { terminal_voltage_pu, induced_voltage_pu, reactance_pu } = params;
    if (terminal_voltage_pu === undefined || induced_voltage_pu === undefined || reactance_pu === undefined)
      return null;
    return buildFrom(terminal_voltage_pu, induced_voltage_pu, reactance_pu);
  },
};
