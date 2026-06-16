/**
 * テンプレート: テブナンの定理（理論・numeric）。
 *   テブナン等価電源（開放電圧 E0・等価内部抵抗 R0）に負荷 RL を接続したときの負荷電流:
 *     I = E0 / (R0 + RL)    〔A〕
 *
 * 典型ミス（解説で言及）:
 *   ・I=E0/RL … 等価内部抵抗 R0 を無視する
 *   ・I=E0/R0 … 負荷抵抗 RL を分母に入れ忘れる
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { defineTemplate, pick } from "./helpers.js";

const EMF_SET: ReadonlyArray<number> = [10, 20, 30, 60, 100, 120]; // 〔V〕
const R0_SET: ReadonlyArray<number> = [2, 4, 5, 10]; // 〔Ω〕
const RL_SET: ReadonlyArray<number> = [6, 8, 10, 15, 20]; // 〔Ω〕

type Params = {
  emf: number;
  thevenin_resistance: number;
  load_resistance: number;
};

export const theveninLoadCurrent = defineTemplate<Params>({
  topic: "テブナンの定理",
  subject: "理論",
  exam: "denken2_primary",
  difficulty: 2,
  pastExam: {
    area: "直流回路",
    frequency: "high",
    years: [2006, 2010, 2015, 2020, 2024],
    note: "テブナン等価 E0,R0 に負荷RLを接続したときの負荷電流 I=E0/(R0+RL)",
  },
  paramSpecs: {
    emf: { unit: "V", realistic_range: [10, 120] },
    thevenin_resistance: { unit: "Ω", realistic_range: [2, 10] },
    load_resistance: { unit: "Ω", realistic_range: [6, 20] },
  },
  paramOrder: ["emf", "thevenin_resistance", "load_resistance"],
  draw(rng) {
    return {
      emf: pick(EMF_SET, rng),
      thevenin_resistance: pick(R0_SET, rng),
      load_resistance: pick(RL_SET, rng),
    };
  },
  buildFrom({ emf, thevenin_resistance: r0, load_resistance: rl }) {
    if (emf <= 0 || r0 <= 0 || rl <= 0) return null;
    const i = emf / (r0 + rl); // 負荷電流〔A〕
    if (!isCleanAnswer(i)) return null;
    const answerText = formatClean(i);
    return {
      format: "numeric",
      params: {
        emf: { value: emf, unit: "V", realistic_range: [10, 120] },
        thevenin_resistance: { value: r0, unit: "Ω", realistic_range: [2, 10] },
        load_resistance: { value: rl, unit: "Ω", realistic_range: [6, 20] },
      },
      answerValue: i,
      answerUnit: "A",
      answerText,
      facts: { emf, r0, rl, i },
      defaultStatement:
        `ある回路をテブナン等価電源で表すと、開放電圧 E0=${formatClean(emf)}V、` +
        `等価内部抵抗 R0=${formatClean(r0)}Ω であった。この端子に負荷抵抗 RL=${formatClean(rl)}Ω を接続したとき、` +
        `負荷に流れる電流 I〔A〕は?`,
      defaultSolution: [
        `テブナンの定理より I=E0/(R0+RL)`,
        `I=${formatClean(emf)}/(${formatClean(r0)}+${formatClean(rl)})`,
        `I=${answerText}A`,
      ],
      physicallyValid: true,
    };
  },
});
