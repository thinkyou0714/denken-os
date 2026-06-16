/**
 * テンプレート: 直並列合成抵抗。
 *   R1 と (R2 ∥ R3) の直列。 R = R1 + R2·R3/(R2+R3) 〔Ω〕
 * 正解はコードで算出。誤答は典型ミス（全部直列・R1を忘れ並列のみ・R3を無視）。
 */
import { resistorLadderFigure } from "../figures/index.js";
import { defineTemplate, pick } from "./helpers.js";

const R1_SET = [5, 10, 15, 20, 30];
// 並列が整数になる (R2,R3) ペア。
const PAR_PAIRS: ReadonlyArray<readonly [number, number]> = [
  [20, 20],
  [30, 60],
  [10, 40],
  [12, 12],
  [6, 12],
  [20, 30],
  [40, 60],
  [10, 10],
  [50, 50],
  [60, 30],
];

type Params = {
  R1: number;
  R2: number;
  R3: number;
};

export const resistorNetwork = defineTemplate<Params>({
  topic: "直並列合成抵抗",
  subject: "理論",
  exam: "denken3",
  difficulty: 1,
  pastExam: { area: "直流回路", frequency: "high", years: [2006, 2010, 2014, 2018, 2022] },
  paramSpecs: {
    R1: { unit: "ohm", realistic_range: [1, 100] },
    R2: { unit: "ohm", realistic_range: [1, 100] },
    R3: { unit: "ohm", realistic_range: [1, 100] },
  },
  paramOrder: ["R1", "R2", "R3"],
  draw(rng) {
    const R1 = pick(R1_SET, rng);
    const [R2, R3] = pick(PAR_PAIRS, rng);
    return { R1, R2, R3 };
  },
  buildFrom({ R1, R2, R3 }) {
    if (R1 <= 0 || R2 <= 0 || R3 <= 0) return null;
    const parallel = (R2 * R3) / (R2 + R3);
    if (!Number.isInteger(parallel)) return null;

    const total = R1 + parallel; // 正解
    const seriesAll = R1 + R2 + R3; // 全部直列
    const parallelOnly = parallel; // R1 を忘れた
    const dropR3 = R1 + R2; // R3 を無視

    const vals = [total, seriesAll, parallelOnly, dropR3];
    if (!vals.every((v) => Number.isInteger(v) && v > 0)) return null;
    const texts = new Set(vals.map((v) => String(v)));
    if (texts.size !== 4) return null;

    const answerText = String(total);
    const choices = [...texts].sort((a, b) => Number(a) - Number(b));

    return {
      params: {
        R1: { value: R1, unit: "ohm", realistic_range: [1, 100] },
        R2: { value: R2, unit: "ohm", realistic_range: [1, 100] },
        R3: { value: R3, unit: "ohm", realistic_range: [1, 100] },
      },
      answerValue: total,
      answerUnit: "Ω",
      answerText,
      choices,
      distractors: [
        { text: String(seriesAll), reason: "並列を見落とし全部直列で加算" },
        { text: String(parallelOnly), reason: "直列のR1を忘れ並列のみ" },
        { text: String(dropR3), reason: "R3を無視" },
      ],
      likelyWrongChoice: String(seriesAll),
      facts: { R1, R2, R3, parallel, total },
      defaultStatement: `抵抗R1=${R1}Ωに、R2=${R2}ΩとR3=${R3}Ωの並列回路を直列接続した。合成抵抗R〔Ω〕は?`,
      defaultSolution: [
        `並列部 R2∥R3 = R2·R3/(R2+R3) = ${R2}·${R3}/(${R2}+${R3}) = ${parallel}Ω`,
        `直列なので R = R1 + (R2∥R3) = ${R1} + ${parallel}`,
        `R = ${answerText}Ω`,
      ],
      figure: resistorLadderFigure(R1, R2, R3),
      physicallyValid: true,
    };
  },
});
