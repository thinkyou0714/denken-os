/**
 * テンプレート: オペアンプ非反転増幅器の電圧利得（理論・numeric）。
 *   理想オペアンプ（仮想短絡・入力電流0）の非反転増幅:
 *     Av = 1 + Rf / Ri    （Rf=帰還抵抗, Ri=接地側抵抗）
 *
 * 典型ミス（解説で言及）:
 *   ・Rf/Ri … 反転増幅（−Rf/Ri）の利得と混同し「+1」を落とす
 *   ・Ri/Rf … 帰還抵抗と接地抵抗の取り違え
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { defineTemplate, pick } from "./helpers.js";

const RI_SET: ReadonlyArray<number> = [1, 2, 5, 10]; // 〔kΩ〕
const RF_SET: ReadonlyArray<number> = [4, 9, 10, 18, 19, 20, 40, 90]; // 〔kΩ〕

type Params = {
  feedback_resistance: number;
  ground_resistance: number;
};

export const opAmpNoninvertingGain = defineTemplate<Params>({
  topic: "オペアンプ非反転増幅",
  subject: "理論",
  exam: "denken2_primary",
  difficulty: 2,
  pastExam: {
    area: "電子回路",
    frequency: "mid",
    years: [2009, 2013, 2017, 2021, 2024],
    note: "理想オペアンプの仮想短絡から利得を導く。反転/非反転の利得式が頻出",
  },
  paramSpecs: {
    feedback_resistance: { unit: "kohm", realistic_range: [1, 100] },
    ground_resistance: { unit: "kohm", realistic_range: [1, 100] },
  },
  paramOrder: ["feedback_resistance", "ground_resistance"],
  draw(rng) {
    return {
      feedback_resistance: pick(RF_SET, rng),
      ground_resistance: pick(RI_SET, rng),
    };
  },
  buildFrom({ feedback_resistance: rf, ground_resistance: ri }) {
    if (rf <= 0 || ri <= 0) return null;
    const gain = 1 + rf / ri; // 非反転増幅の電圧利得（無次元）
    if (!isCleanAnswer(gain)) return null;
    if (gain <= 1) return null; // 増幅器として成立する範囲（Rf>0 で必ず>1）
    const answerText = formatClean(gain);
    return {
      format: "numeric",
      params: {
        feedback_resistance: { value: rf, unit: "kohm", realistic_range: [1, 100] },
        ground_resistance: { value: ri, unit: "kohm", realistic_range: [1, 100] },
      },
      answerValue: gain,
      answerUnit: "倍",
      answerText,
      facts: { rf, ri, gain },
      defaultStatement:
        `理想オペアンプを用いた非反転増幅回路で、帰還抵抗 Rf=${rf}kΩ、` +
        `反転入力と接地の間の抵抗 Ri=${ri}kΩ である。電圧利得 Av〔倍〕はいくらか。`,
      defaultSolution: [
        `非反転増幅の電圧利得は Av=1+Rf/Ri`,
        `Av=1+${rf}/${ri}=1+${formatClean(rf / ri)}`,
        `Av=${answerText}倍`,
      ],
      physicallyValid: true,
    };
  },
});
