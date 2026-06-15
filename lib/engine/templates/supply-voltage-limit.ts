/**
 * テンプレート: 供給電圧の維持（法規・multiple_choice）。
 *   電気事業法第26条・施行規則: 標準電圧100Vは 101±6V、200Vは 202±20V に維持。
 *   上限・下限のどちらかを問う（境界値の取り違えが最頻誤答）。
 */
import { formatClean } from "../clean.js";
import { defineTemplate } from "./helpers.js";

interface Case {
  question: string;
  answer: number;
  pool: ReadonlyArray<number>;
}

const CASES: ReadonlyArray<Case> = [
  { question: "標準電圧100Vの電気を供給する場所での上限値〔V〕", answer: 107, pool: [101, 106, 107, 110] },
  { question: "標準電圧100Vの電気を供給する場所での下限値〔V〕", answer: 95, pool: [90, 94, 95, 100] },
  { question: "標準電圧200Vの電気を供給する場所での上限値〔V〕", answer: 222, pool: [202, 220, 222, 230] },
  { question: "標準電圧200Vの電気を供給する場所での下限値〔V〕", answer: 182, pool: [180, 182, 190, 202] },
];

type Params = {
  case_index: number;
};

export const supplyVoltageLimit = defineTemplate<Params>({
  topic: "供給電圧の維持基準",
  subject: "法規",
  exam: "denken2_primary",
  difficulty: 2,
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
      .map((v) => ({ text: formatClean(v), reason: "101±6V / 202±20V の基準値・幅の取り違え" }));
    return {
      format: "multiple_choice",
      params: { case_index: { value: caseIndex, realistic_range: [0, CASES.length - 1] } },
      answerValue: c.answer,
      answerUnit: "V",
      answerText,
      choices,
      distractors,
      facts: { caseIndex, answer: c.answer },
      defaultStatement: `電気事業法令で定める供給電圧の維持基準について、${c.question}は?`,
      defaultSolution: [
        `維持すべき電圧: 標準電圧100V→101±6V（95〜107V）/ 200V→202±20V（182〜222V）`,
        `本問は「${c.question}」`,
        `=${answerText}V`,
      ],
      physicallyValid: true,
    };
  },
});
