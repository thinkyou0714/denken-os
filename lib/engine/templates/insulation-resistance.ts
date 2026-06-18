/**
 * テンプレート: 低圧電路の絶縁抵抗（法規・multiple_choice）。
 *   電技省令 第58条（絶縁性能）の最低値:
 *     使用電圧300V以下・対地電圧150V以下 → 0.1MΩ
 *     使用電圧300V以下・その他          → 0.2MΩ
 *     使用電圧300V超                     → 0.4MΩ
 *   一次法規は択一が本番形式のため、区分の取り違えを誤答に置く。
 */
import { formatClean } from "../clean.js";
import { defineTemplate } from "./helpers.js";

interface Case {
  cond: string;
  answer: number;
  /** 各誤答値が「なぜ紛らわしいか（典型的な思い違い）」の具体説明。 */
  reasons: Record<number, string>;
}

const CASES: ReadonlyArray<Case> = [
  {
    cond: "使用電圧が300V以下で、対地電圧が150V以下",
    answer: 0.1,
    reasons: {
      0.2: "同じ300V以下でも対地150V超の区分(0.2MΩ)と取り違え（対地150V以下は0.1MΩ）",
      0.4: "300V超の区分(0.4MΩ)を適用した取り違え（本問は300V以下・対地150V以下で0.1MΩ）",
      1: "切りのよい1MΩと当て推量、または高圧機器の判定基準との混同",
    },
  },
  {
    cond: "使用電圧が300V以下で、対地電圧が150Vを超える",
    answer: 0.2,
    reasons: {
      0.1: "対地150V以下の区分(0.1MΩ)と取り違え（対地150V超は0.2MΩ）",
      0.4: "300V超の区分(0.4MΩ)を適用した取り違え（本問は300V以下で0.2MΩ）",
      1: "切りのよい1MΩと当て推量、または高圧機器の判定基準との混同",
    },
  },
  {
    cond: "使用電圧が300Vを超える",
    answer: 0.4,
    reasons: {
      0.1: "300V以下・対地150V以下の区分(0.1MΩ)と取り違え（300V超は0.4MΩ）",
      0.2: "300V以下・対地150V超の区分(0.2MΩ)と取り違え（300V超は0.4MΩ）",
      1: "切りのよい1MΩと当て推量、または高圧機器の判定基準との混同",
    },
  },
];
const CHOICE_POOL: ReadonlyArray<number> = [0.1, 0.2, 0.4, 1];

type Params = {
  case_index: number;
};

export const insulationResistance = defineTemplate<Params>({
  topic: "低圧電路の絶縁抵抗",
  subject: "法規",
  exam: "denken2_primary",
  difficulty: 2,
  pastExam: { area: "絶縁・絶縁耐力", frequency: "high", years: [2006, 2011, 2016, 2021] },
  paramSpecs: { case_index: { realistic_range: [0, CASES.length - 1] } },
  paramOrder: ["case_index"],
  draw(rng) {
    return { case_index: Math.floor(rng() * CASES.length) };
  },
  buildFrom({ case_index: caseIndex }) {
    const c = CASES[caseIndex];
    if (!c) return null;
    const answerText = formatClean(c.answer);
    const choices = CHOICE_POOL.map((v) => formatClean(v));
    const distractors = CHOICE_POOL.filter((v) => v !== c.answer).map((v) => ({
      text: formatClean(v),
      reason: c.reasons[v] ?? "使用電圧・対地電圧の区分の取り違え",
    }));
    return {
      format: "multiple_choice",
      params: { case_index: { value: caseIndex, realistic_range: [0, CASES.length - 1] } },
      answerValue: c.answer,
      answerUnit: "MΩ",
      answerText,
      choices,
      distractors,
      // CASES の長さは 3 固定のため (caseIndex + 1) % 3 は必ず有効なインデックス。
      likelyWrongChoice: formatClean((CASES[(caseIndex + 1) % CASES.length] as (typeof CASES)[number]).answer),
      facts: { caseIndex, answer: c.answer },
      defaultStatement:
        `${c.cond}低圧電路において、電線相互間および電路と大地との間の絶縁抵抗の最低値〔MΩ〕として、` +
        `電気設備技術基準で定められている値は?`,
      defaultSolution: [
        `電技省令第58条: 300V以下かつ対地150V以下=0.1MΩ / 300V以下その他=0.2MΩ / 300V超=0.4MΩ`,
        `本問は「${c.cond}」の区分`,
        `=${answerText}MΩ`,
      ],
      physicallyValid: true,
    };
  },
});
