/**
 * テンプレート: 三相送電線の電力損失（電力・五択マークシート）。
 *   三相3線式の線路損失  P_loss = 3·I²·R  〔W〕
 *   （各相 I²R の3線合計。1線あたり抵抗 R）
 *
 * 本番（一次）は五択マークシートのため、コード算出の P_loss を真値とし、
 * 典型ミス由来の誤答を buildMcChoices で五択に整える。
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { buildMcChoices, defineTemplate, pick } from "./helpers.js";

const I_SET: ReadonlyArray<number> = [10, 20, 30, 40, 50, 80, 100];
const R_SET: ReadonlyArray<number> = [0.5, 1, 2, 2.5, 5];

type Params = {
  line_current: number;
  line_resistance: number;
};

export const transmissionLoss = defineTemplate<Params>({
  topic: "送電線の電力損失",
  subject: "電力",
  exam: "denken2_primary",
  difficulty: 2,
  pastExam: { area: "送電・線路計算", frequency: "high", years: [2006, 2011, 2016, 2021] },
  paramSpecs: {
    line_current: { unit: "A", realistic_range: [10, 100] },
    line_resistance: { unit: "Ω", realistic_range: [0.5, 5] },
  },
  paramOrder: ["line_current", "line_resistance"],
  draw(rng) {
    return {
      line_current: pick(I_SET, rng),
      line_resistance: pick(R_SET, rng),
    };
  },
  buildFrom({ line_current: I, line_resistance: R }) {
    if (I <= 0 || R <= 0) return null;
    const lossW = 3 * I * I * R;
    const lossKW = lossW / 1000;
    if (!isCleanAnswer(lossKW)) return null;

    // 五択（典型ミス由来の誤答）。すべて kW 表示で綺麗・一意になることを buildMcChoices で担保。
    const mc = buildMcChoices(
      lossKW,
      [
        { value: lossKW / 3, reason: "3線分の係数3を忘れ1線分 I²R のみで計算" },
        { value: 2 * lossKW, reason: "電力損失を誤って2倍にした（係数2のミス）" },
        { value: lossW, reason: "W→kW の単位換算（÷1000）を忘れ W のまま答えた" },
        { value: lossW / 3, reason: "係数3を忘れ、かつ kW 換算も忘れた（I²R を W のまま）" },
      ],
      formatClean,
    );
    if (!mc) return null;

    return {
      params: {
        line_current: { value: I, unit: "A", realistic_range: [10, 100] },
        line_resistance: { value: R, unit: "Ω", realistic_range: [0.5, 5] },
      },
      answerValue: lossKW,
      answerUnit: "kW",
      answerText: mc.answerText,
      choices: mc.choices,
      distractors: mc.distractors,
      likelyWrongChoice: formatClean(lossW),
      facts: { I, R, lossW, lossKW },
      defaultStatement:
        `三相3線式送電線で線電流 I=${I}A が流れている。1線あたりの抵抗が R=${R}Ω のとき、` +
        `線路全体の電力損失 P_loss〔kW〕は?`,
      defaultSolution: [
        `三相3線式の線路損失 P_loss=3·I²·R`,
        `P_loss=3×${I}²×${R}=${formatClean(lossW)}W`,
        `=${mc.answerText}kW`,
      ],
      physicallyValid: true,
    };
  },
});
