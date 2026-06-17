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
  /** 各誤答値が「なぜ紛らわしいか（典型的な思い違い）」の具体説明。 */
  reasons: Record<number, string>;
}

const CASES: ReadonlyArray<Case> = [
  {
    question: "標準電圧100Vの電気を供給する場所での上限値〔V〕",
    answer: 107,
    pool: [101, 106, 107, 110],
    reasons: {
      101: "維持目標の中心値101Vを上限値と取り違え（上限は101+6=107V）",
      106: "中心100Vに幅6を足した106Vとする誤り（基準は101±6なので107V）",
      110: "±10%の感覚で110Vと当て推量（規定は101±6V）",
    },
  },
  {
    question: "標準電圧100Vの電気を供給する場所での下限値〔V〕",
    answer: 95,
    pool: [90, 94, 95, 100],
    reasons: {
      90: "±10Vの感覚で90Vと当て推量（規定は101±6V＝95〜107V）",
      94: "中心100Vから幅6を引いた94Vとする誤り（基準は101±6なので95V）",
      100: "標準電圧100Vそのものを下限値と取り違え（下限は101−6=95V）",
    },
  },
  {
    question: "標準電圧200Vの電気を供給する場所での上限値〔V〕",
    answer: 222,
    pool: [202, 220, 222, 230],
    reasons: {
      202: "維持目標の中心値202Vを上限値と取り違え（上限は202+20=222V）",
      220: "中心200Vに幅20を足した220Vとする誤り（基準は202±20なので222V）",
      230: "±15%程度の感覚で230Vと当て推量（規定は202±20V）",
    },
  },
  {
    question: "標準電圧200Vの電気を供給する場所での下限値〔V〕",
    answer: 182,
    pool: [180, 182, 190, 202],
    reasons: {
      180: "中心200Vから幅20を引いた180Vとする誤り（基準は202±20なので182V）",
      190: "幅を小さく見積もり190Vと当て推量（規定は202±20V＝182〜222V）",
      202: "維持目標の中心値202Vを下限値と取り違え（下限は202−20=182V）",
    },
  },
];

type Params = {
  case_index: number;
};

export const supplyVoltageLimit = defineTemplate<Params>({
  topic: "供給電圧の維持基準",
  subject: "法規",
  exam: "denken2_primary",
  difficulty: 2,
  pastExam: { area: "電気事業法・電気工作物", frequency: "high", years: [2008, 2014, 2020, 2025] },
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
      .map((v) => ({ text: formatClean(v), reason: c.reasons[v] ?? "101±6V / 202±20V の基準値・幅の取り違え" }));
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
