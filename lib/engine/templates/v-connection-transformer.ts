/**
 * テンプレート: V結線変圧器の出力比・利用率（機械・multiple_choice）。
 *
 * 単相変圧器2台を V結線（オープンデルタ）にすると、三相出力は
 *   P_V = √3 · P_1   〔kVA〕   （P_1 = 単相変圧器1台の定格容量）
 * となる。これを基に2つの代表比を問う:
 *   ① 利用率（設備利用率） = P_V /(2·P_1) = √3/2 ≈ 0.866 ≒ 0.87
 *      … 設置した2台分の容量に対し実際に取り出せる三相出力の割合。
 *   ② 出力比（同一変圧器をΔ結線3台にした場合との比）
 *      = P_V / P_Δ = (√3·P_1)/(3·P_1) = 1/√3 ≈ 0.577 ≒ 0.58
 *      … Δ結線(3台)からV結線(2台,1台故障)になったときに残る出力の割合。
 *
 * 注: √3 を含むため出力 P_V 自体は綺麗な値にならない。択一で「比」を問う形にし、
 *     正解・誤答とも2桁小数の綺麗な値（isCleanAnswer 通過）に収める。
 *
 * 誤答（成立する典型ミス）:
 *   - 0.5  … 2台→4台分などと取り違え 1/2 とする誤り
 *   - 0.58 / 0.87 … 利用率と出力比の取り違え（√3/2 と 1/√3 の混同）
 *   - 0.67 … 2/3（台数比そのまま）と誤る
 *   - 1.0  … 出力は変わらないと誤解
 */
import { formatClean } from "../clean.js";
import { defineTemplate } from "./helpers.js";

interface Case {
  question: string;
  answer: number;
  pool: ReadonlyArray<number>;
  fact: string;
  reasons: Record<number, string>;
}

const CASES: ReadonlyArray<Case> = [
  {
    question: "設置した2台分の容量に対する三相出力の割合（利用率）として最も近い値",
    answer: 0.87,
    pool: [0.5, 0.58, 0.67, 0.87, 1.0],
    fact: "利用率 = P_V/(2P_1) = √3·P_1/(2P_1) = √3/2 ≈ 0.866",
    reasons: {
      0.5: "2台だから1/2と取り違え（容量は√3倍取り出せる）",
      0.58: "出力比 1/√3≈0.58（Δ3台との比）と利用率を混同",
      0.67: "稼働台数比 2/3 をそのまま利用率とする誤り（利用率は√3/2）",
      1.0: "2台分の容量がそのまま三相出力になると誤解（√3/2に減る）",
    },
  },
  {
    question: "同一変圧器をΔ結線で3台使った場合の出力に対する、V結線(2台)の出力の割合として最も近い値",
    answer: 0.58,
    pool: [0.5, 0.58, 0.67, 0.87, 1.0],
    fact: "出力比 = P_V/P_Δ = √3·P_1/(3·P_1) = 1/√3 ≈ 0.577",
    reasons: {
      0.5: "Δ3台→V2台で出力も1/2になると誤解（実際は1/√3）",
      0.67: "台数比 2/3 をそのまま出力比とする誤り",
      0.87: "利用率 √3/2≈0.87（2台分との比）と出力比を混同",
      1.0: "1台故障しても三相出力は変わらないと誤解（1/√3に減る）",
    },
  },
];

type Params = {
  case_index: number;
};

export const vConnectionTransformer = defineTemplate<Params>({
  topic: "V結線変圧器の出力比・利用率",
  subject: "機械",
  exam: "denken2_primary",
  difficulty: 3,
  pastExam: { area: "変圧器", frequency: "mid", years: [2009, 2014, 2019, 2024] },
  paramSpecs: { case_index: { realistic_range: [0, CASES.length - 1] } },
  paramOrder: ["case_index"],
  draw(rng) {
    return { case_index: Math.floor(rng() * CASES.length) };
  },
  buildFrom({ case_index: caseIndex }) {
    const c = CASES[caseIndex];
    if (!c) return null;
    const answerText = formatClean(c.answer);
    const choices = c.pool.map((v) => formatClean(v));
    const distractors = c.pool
      .filter((v) => v !== c.answer)
      .map((v) => ({
        text: formatClean(v),
        reason: c.reasons[v] ?? "V結線の出力比・利用率の取り違え",
      }));
    return {
      format: "multiple_choice",
      params: { case_index: { value: caseIndex, realistic_range: [0, CASES.length - 1] } },
      answerValue: c.answer,
      answerUnit: "",
      answerText,
      choices,
      distractors,
      facts: { caseIndex, answer: c.answer },
      defaultStatement:
        `定格容量が等しい単相変圧器2台をV結線（オープンデルタ）にして三相負荷に電力を供給する。` + `${c.question}は?`,
      defaultSolution: [`V結線2台の三相出力は P_V=√3·P_1（P_1=単相1台の定格容量）`, c.fact, `=${answerText}`],
      physicallyValid: true,
    };
  },
});
