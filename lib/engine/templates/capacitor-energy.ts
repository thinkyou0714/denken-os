/**
 * テンプレート: コンデンサの静電エネルギー（numeric 形式）。
 *   W = ½·C·V²  〔J〕   (C は静電容量, V は電圧)
 * 二次（記述/計算）寄りの「選択肢なし・数値回答」形式のデモ。正解はコードで算出。
 */
import { ANSWER_EPSILON } from "../clean.js";
import { defineTemplate, pick } from "./helpers.js";

const CAP_UF = [1, 2, 4, 5, 10, 20, 47, 100]; // μF
const VOLT = [10, 20, 50, 100, 200];

/** 値を「綺麗な」mJ 文字列に整形（小数2桁で割り切れるもののみ採用）。 */
function formatMilliJoule(joule: number): string | null {
  const mJ = joule * 1000;
  if (Math.abs(mJ * 100 - Math.round(mJ * 100)) > ANSWER_EPSILON) return null;
  // 小数2桁に丸めたうえで余分な0を落とす（50.00→"50", 12.50→"12.5", 2.56→"2.56"）。
  return String(Number(mJ.toFixed(2)));
}

type Params = {
  capacitance: number;
  voltage: number;
};

export const capacitorEnergy = defineTemplate<Params>({
  topic: "コンデンサの静電エネルギー",
  subject: "理論",
  exam: "denken3",
  difficulty: 2,
  pastExam: { area: "静電気", frequency: "high", years: [2008, 2012, 2016, 2020, 2024] },
  paramSpecs: {
    capacitance: { unit: "uF", realistic_range: [1, 100] },
    voltage: { unit: "V", realistic_range: [10, 200] },
  },
  paramOrder: ["capacitance", "voltage"],
  draw(rng) {
    return {
      capacitance: pick(CAP_UF, rng),
      voltage: pick(VOLT, rng),
    };
  },
  buildFrom({ capacitance: C_uF, voltage: V }) {
    if (C_uF <= 0 || V <= 0) return null;
    const C = C_uF * 1e-6;
    const W = 0.5 * C * V * V; // J
    const text = formatMilliJoule(W);
    if (text === null) return null;
    return {
      format: "numeric",
      params: {
        capacitance: { value: C_uF, unit: "uF", realistic_range: [1, 100] },
        voltage: { value: V, unit: "V", realistic_range: [10, 200] },
      },
      answerValue: W,
      answerUnit: "mJ",
      answerText: text,
      facts: { C_uF, V, W_joule: W },
      defaultStatement: `静電容量${C_uF}μFのコンデンサに${V}Vの電圧を加えた。蓄えられる静電エネルギーW〔mJ〕は?`,
      defaultSolution: [`W=½·C·V² で算出する`, `W=0.5×${C_uF}×10⁻⁶×${V}²`, `W=${text}mJ`],
      physicallyValid: true,
    };
  },
});
