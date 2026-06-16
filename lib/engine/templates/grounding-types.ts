/**
 * テンプレート: 接地工事の種類と接地抵抗値（法規・multiple_choice）。
 *   電技解釈 第17条: A種=10Ω以下（高圧・特別高圧の機器外箱等）/
 *   C種=10Ω以下（300V超の低圧）/ D種=100Ω以下（300V以下の低圧）。
 *   （C・D種は低圧側0.5秒以内遮断で500Ω以下に緩和されるが、本問は原則値を問う）
 */
import { formatClean } from "../clean.js";
import { defineTemplate } from "./helpers.js";

interface Case {
  kind: string;
  answer: number;
  pool: ReadonlyArray<number>;
}

const CASES: ReadonlyArray<Case> = [
  { kind: "A種接地工事（高圧用機器の鉄台・金属製外箱など）", answer: 10, pool: [5, 10, 30, 100] },
  { kind: "C種接地工事（300Vを超える低圧用機器の金属製外箱など）", answer: 10, pool: [10, 30, 100, 500] },
  { kind: "D種接地工事（300V以下の低圧用機器の金属製外箱など）", answer: 100, pool: [10, 30, 100, 500] },
];

type Params = {
  case_index: number;
};

export const groundingTypes = defineTemplate<Params>({
  topic: "接地工事の種類と抵抗値",
  subject: "法規",
  exam: "denken2_primary",
  difficulty: 2,
  pastExam: { area: "接地工事", frequency: "high", years: [2006, 2010, 2015, 2020] },
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
        reason: v === 500 ? "0.5秒以内遮断時の緩和値(500Ω)との混同" : "接地工事の種類ごとの値の取り違え",
      }));
    return {
      format: "multiple_choice",
      params: { case_index: { value: caseIndex, realistic_range: [0, CASES.length - 1] } },
      answerValue: c.answer,
      answerUnit: "Ω",
      answerText,
      choices,
      distractors,
      facts: { caseIndex, answer: c.answer },
      defaultStatement: `${c.kind}に必要な接地抵抗値として、原則の上限〔Ω〕は?`,
      defaultSolution: [
        `電技解釈第17条: A種=10Ω / B種=計算値 / C種=10Ω / D種=100Ω（C・D種は0.5秒以内遮断で500Ωに緩和）`,
        `本問は「${c.kind}」`,
        `=${answerText}Ω`,
      ],
      physicallyValid: true,
    };
  },
});
