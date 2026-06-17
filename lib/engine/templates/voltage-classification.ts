/**
 * テンプレート: 電圧の区分（法規・multiple_choice）。
 *   電技省令 第2条: 低圧=交流600V以下/直流750V以下、高圧=低圧超〜7000V以下、
 *   特別高圧=7000V超。区分の境界値を問う（一次法規の頻出知識）。
 */
import { formatClean } from "../clean.js";
import { defineTemplate } from "./helpers.js";

interface Case {
  question: string;
  answer: number;
  pool: ReadonlyArray<number>;
  fact: string;
  /** 各誤答値が「なぜ紛らわしいか（典型的な思い違い）」の具体説明。 */
  reasons: Record<number, string>;
}

const CASES: ReadonlyArray<Case> = [
  {
    question: "交流における「低圧」の上限電圧〔V〕",
    answer: 600,
    pool: [300, 450, 600, 750],
    fact: "低圧: 交流600V以下・直流750V以下",
    reasons: {
      300: "対地電圧150V/300Vの屋内配線の区分値と混同（低圧の上限は交流600V）",
      450: "600Vと750Vの中間値という当て推量（根拠となる区分はない）",
      750: "直流の低圧上限750Vを交流にそのまま適用した取り違え",
    },
  },
  {
    question: "直流における「低圧」の上限電圧〔V〕",
    answer: 750,
    pool: [600, 700, 750, 900],
    fact: "低圧: 交流600V以下・直流750V以下",
    reasons: {
      600: "交流の低圧上限600Vを直流にそのまま適用した取り違え",
      700: "750Vの概数として誤記憶した値",
      900: "直流側の方が高いはずと過大に見積もった当て推量",
    },
  },
  {
    question: "「高圧」の上限電圧（これを超えると特別高圧）〔V〕",
    answer: 7000,
    pool: [3500, 6600, 7000, 10000],
    fact: "高圧: 低圧を超え7000V以下（7000V超は特別高圧）",
    reasons: {
      3500: "7000Vの半分という当て推量（区分の根拠はない）",
      6600: "高圧配電の公称電圧6600Vを区分の境界値と混同（境界は7000V）",
      10000: "切りのよい1万Vを境界と誤記憶（実際は7000V超で特別高圧）",
    },
  },
];

type Params = {
  case_index: number;
};

export const voltageClassification = defineTemplate<Params>({
  topic: "電圧の区分",
  subject: "法規",
  exam: "denken2_primary",
  difficulty: 1,
  pastExam: { area: "電気設備技術基準", frequency: "high", years: [2008, 2013, 2018, 2023] },
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
        reason: c.reasons[v] ?? "交流/直流・低圧/高圧の境界の取り違え",
      }));
    return {
      format: "multiple_choice",
      params: { case_index: { value: caseIndex, realistic_range: [0, CASES.length - 1] } },
      answerValue: c.answer,
      answerUnit: "V",
      answerText,
      choices,
      distractors,
      facts: { caseIndex, answer: c.answer },
      defaultStatement: `電気設備技術基準で定める電圧の区分について、${c.question}は?`,
      defaultSolution: [`電技省令第2条: ${c.fact}`, `=${answerText}V`],
      physicallyValid: true,
    };
  },
});
