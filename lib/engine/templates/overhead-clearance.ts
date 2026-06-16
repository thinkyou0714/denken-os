/**
 * テンプレート: 高圧架空電線の高さ（法規・multiple_choice）。
 *   電技解釈 第68条（高圧架空電線）: 道路横断=6m以上 / 鉄道・軌道横断=レール面上5.5m以上 /
 *   横断歩道橋の上=路面上3.5m以上 / その他=地表上5m以上。
 *   ※ 低圧には道路以外で4m等の例外があるため、曖昧さを避けて高圧に限定して出題する。
 */
import { formatClean } from "../clean.js";
import { defineTemplate } from "./helpers.js";

interface Case {
  place: string;
  answer: number;
  pool: ReadonlyArray<number>;
}

const CASES: ReadonlyArray<Case> = [
  { place: "道路（車道）を横断する場合の路面上の高さ", answer: 6, pool: [4, 5, 5.5, 6] },
  { place: "鉄道または軌道を横断する場合のレール面上の高さ", answer: 5.5, pool: [4.5, 5, 5.5, 6] },
  { place: "横断歩道橋の上に施設される場合の路面上の高さ", answer: 3.5, pool: [3, 3.5, 4, 5] },
  { place: "上記以外の場所（その他の原則）の地表上の高さ", answer: 5, pool: [4, 4.5, 5, 6] },
];

type Params = {
  case_index: number;
};

export const overheadClearance = defineTemplate<Params>({
  topic: "高圧架空電線の高さ",
  subject: "法規",
  exam: "denken2_primary",
  difficulty: 2,
  pastExam: { area: "電線路・架空配電", frequency: "high", years: [2009, 2014, 2019, 2024] },
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
      .map((v) => ({ text: formatClean(v), reason: "施設場所ごとの基準高さの取り違え" }));
    return {
      format: "multiple_choice",
      params: { case_index: { value: caseIndex, realistic_range: [0, CASES.length - 1] } },
      answerValue: c.answer,
      answerUnit: "m",
      answerText,
      choices,
      distractors,
      facts: { caseIndex, answer: c.answer },
      defaultStatement: `高圧架空電線を施設する場合、${c.place}の最小値〔m〕として定められている値は?`,
      defaultSolution: [
        `電技解釈第68条（高圧架空電線）: 道路横断6m / 鉄道横断5.5m / 横断歩道橋上3.5m / その他5m`,
        `本問は「${c.place}」`,
        `=${answerText}m`,
      ],
      physicallyValid: true,
    };
  },
});
