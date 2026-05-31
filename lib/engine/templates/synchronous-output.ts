/**
 * テンプレート: 同期発電機の出力（電力角の式, 単位法）。
 *
 * 閉形式: P = (V·E/X_s)·sin δ   〔pu〕   （V=1pu, 負荷角 δ=30°→sin δ=0.5 固定）
 *   ⇒ P = (E/X_s)·sin δ。
 *
 * 誤答（成立する典型ミス）:
 *   ① E/X_s          sin δ を 1（δ=90° 最大出力）と取り違えた
 *   ② E·sin δ        同期リアクタンス X_s で割り忘れた
 *   ③ E·X_s·sin δ    X_s で割るべきところを掛けた
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

const SIN_DELTA = 0.5; // δ=30°
// [E_f(pu), X_s(pu)]。P, E/X, E·sinδ, E·X·sinδ が綺麗かつ相異なる組。
const SETS: ReadonlyArray<readonly [number, number]> = [
  [1.2, 0.8],
  [1.5, 0.5],
  [1.0, 0.5],
  [2.0, 0.8],
  [1.2, 0.5],
  [1.0, 0.8],
  [1.6, 0.8],
  [1.5, 1.0],
];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(Ef: number, Xs: number): GenerationResult | null {
  if (Ef <= 0 || Xs <= 0) return null;
  const P = (Ef / Xs) * SIN_DELTA; // 正解
  const maxP = Ef / Xs; // ① sinδ=1
  const noX = Ef * SIN_DELTA; // ②
  const mulX = Ef * Xs * SIN_DELTA; // ③

  const vals = [P, maxP, noX, mulX];
  if (!vals.every((v) => isCleanAnswer(v))) return null;
  const answerText = formatClean(P);
  const texts = new Set(vals.map((v) => formatClean(v)));
  if (texts.size !== 4) return null;

  const choices = [...texts].sort((a, b) => Number(a) - Number(b));
  return {
    params: {
      induced_voltage_pu: { value: Ef, unit: "pu", realistic_range: [0.8, 2.5] },
      reactance_pu: { value: Xs, unit: "pu", realistic_range: [0.3, 1.5] },
    },
    answerValue: P,
    answerUnit: "pu",
    answerText,
    choices,
    distractors: [
      { text: formatClean(maxP), reason: "sin δ を 1（δ=90° 最大出力）と取り違えた" },
      { text: formatClean(noX), reason: "同期リアクタンス X_s で割り忘れた" },
      { text: formatClean(mulX), reason: "X_s で割るべきところを掛けた" },
    ],
    likelyWrongChoice: formatClean(maxP),
    facts: { Ef, Xs, sin_delta: SIN_DELTA, P },
    defaultStatement:
      `端子電圧 V=1.0pu の同期発電機が、誘導起電力 E=${Ef}pu、同期リアクタンス X_s=${Xs}pu で負荷角 δ=30° で運転している。` +
      `発電機の出力 P〔pu〕は? （sin30°=0.5）`,
    defaultSolution: [`電力角の式 P = (V·E/X_s)·sin δ、V=1pu`, `= (${Ef}/${Xs}) × 0.5`, `P = ${answerText} pu`],
    physicallyValid: true,
  };
}

export const synchronousOutput: Template = {
  topic: "同期発電機の出力・短絡比",
  subject: "機械",
  exam: "denken3",
  difficulty: 3,
  meta: {
    tags: ["機械", "同期機", "同期発電機", "電力角", "出力"],
    formulas: ["P = (V·E/X_s)·sin δ", "P_max = V·E/X_s（δ=90°）", "短絡比 Ks ≒ 1/x_s"],
    learningObjectives: ["電力角の式で同期発電機の出力を求め、最大出力との関係を説明できる"],
    hints: ["出力は sin δ に比例", "δ=90° で最大 P_max=VE/X_s", "X_s で割る"],
    prerequisites: ["三相交流電力", "パーセントインピーダンスと短絡電流"],
    relatedTopics: ["同期速度", "電力系統の安定度"],
    estimatedTimeSec: 180,
    cognitiveLevel: "apply",
  },
  paramSpecs: {
    induced_voltage_pu: { unit: "pu", realistic_range: [0.8, 2.5] },
    reactance_pu: { unit: "pu", realistic_range: [0.3, 1.5] },
  },
  generate(rng) {
    const [Ef, Xs] = pick(SETS, rng);
    return buildFrom(Ef, Xs);
  },
  generateFrom(params) {
    const { induced_voltage_pu, reactance_pu } = params;
    if (induced_voltage_pu === undefined || reactance_pu === undefined) return null;
    return buildFrom(induced_voltage_pu, reactance_pu);
  },
};
