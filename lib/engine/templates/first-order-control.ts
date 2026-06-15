/**
 * テンプレート: 一次遅れ系のステップ応答（二種二次・機械制御/自動制御・descriptive）。
 *   伝達関数  G(s)=K/(1+Ts)、大きさ A のステップ入力に対する定常値
 *     y(∞) = K·A
 *   （時定数 T〔s〕で t=T のとき最終値の約63.2%に達する）
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { firstOrderBlockFigure } from "../figures/index.js";
import { defineTemplate, pick } from "./helpers.js";

const K_SET: ReadonlyArray<number> = [2, 3, 4, 5, 10];
const A_SET: ReadonlyArray<number> = [1, 2, 4, 5, 10];
const T_SET: ReadonlyArray<number> = [0.1, 0.2, 0.5, 1, 2];

type Params = {
  gain: number;
  step_size: number;
  time_constant: number;
};

export const firstOrderControl = defineTemplate<Params>({
  topic: "一次遅れ系のステップ応答",
  subject: "機械制御",
  exam: "denken2_secondary",
  difficulty: 4,
  paramSpecs: {
    gain: { unit: "", realistic_range: [1, 10] },
    step_size: { unit: "", realistic_range: [1, 10] },
    time_constant: { unit: "s", realistic_range: [0.1, 2] },
  },
  paramOrder: ["gain", "step_size", "time_constant"],
  draw(rng) {
    return {
      gain: pick(K_SET, rng),
      step_size: pick(A_SET, rng),
      time_constant: pick(T_SET, rng),
    };
  },
  buildFrom({ gain: K, step_size: A, time_constant: T }) {
    if (K <= 0 || A <= 0 || T <= 0) return null;
    const yInf = K * A;
    if (!isCleanAnswer(yInf)) return null;
    const answerText = formatClean(yInf);

    return {
      format: "descriptive",
      params: {
        gain: { value: K, unit: "", realistic_range: [1, 10] },
        step_size: { value: A, unit: "", realistic_range: [1, 10] },
        time_constant: { value: T, unit: "s", realistic_range: [0.1, 2] },
      },
      answerValue: yInf,
      answerUnit: "",
      answerText,
      facts: { K, A, T, yInf },
      defaultStatement:
        `一次遅れ要素 G(s)=K/(1+Ts)（ゲイン K=${K}、時定数 T=${T}s）に、大きさ A=${A} のステップ入力を加える。` +
        `出力の定常値 y(∞) を導出過程とともに求めよ。`,
      defaultSolution: [
        `最終値の定理 y(∞)=lim_{s→0} s·G(s)·(A/s)=K·A`,
        `y(∞)=${K}×${A}`,
        `y(∞)=${answerText}`,
        `（t=T=${T}s で最終値の約63.2%に達する）`,
      ],
      figure: firstOrderBlockFigure(K, T),
      physicallyValid: true,
    };
  },
});
