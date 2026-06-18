/**
 * テンプレート: 屋内電路の対地電圧制限（法規・multiple_choice）。
 *   電技解釈 第143条: 住宅の屋内電路の対地電圧は原則150V以下。
 *   定格消費電力2kW以上の機器を専用回路で施設する等の条件を満たせば300V以下にできる。
 */
import { formatClean } from "../clean.js";
import { defineTemplate } from "./helpers.js";

interface Case {
  cond: string;
  answer: number;
  pool: ReadonlyArray<number>;
  /** 各誤答値が「なぜ紛らわしいか（典型的な思い違い）」の具体説明。 */
  reasons: Record<number, string>;
}

const CASES: ReadonlyArray<Case> = [
  {
    cond: "住宅の屋内電路（原則）",
    answer: 150,
    pool: [100, 150, 200, 300],
    reasons: {
      100: "単相100Vの公称電圧と対地電圧の上限を混同（原則は150V以下）",
      200: "単相200V配線を念頭に200Vと当て推量（対地電圧の原則上限は150V）",
      300: "緩和条件下の上限300Vを原則値と取り違え（原則は150V）",
    },
  },
  {
    cond:
      "定格消費電力2kW以上の機器を、専用の開閉器・過電流遮断器と漏電遮断器を施設した専用回路で、" +
      "電線を機器に直接接続して施設する場合",
    answer: 300,
    pool: [150, 200, 300, 600],
    reasons: {
      150: "原則の150Vを緩和条件にも適用した取り違え（条件を満たせば300V以下）",
      200: "200V機器のイメージから200Vと当て推量（緩和後の上限は300V）",
      600: "低圧（交流）の上限600Vと対地電圧の上限を混同（緩和後でも300V以下）",
    },
  },
];

type Params = {
  case_index: number;
};

export const indoorVoltageLimit = defineTemplate<Params>({
  topic: "屋内電路の対地電圧制限",
  subject: "法規",
  exam: "denken2_primary",
  difficulty: 2,
  pastExam: { area: "低圧・引込・屋内配線", frequency: "high", years: [2007, 2013, 2019, 2024] },
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
      .map((v) => ({ text: formatClean(v), reason: c.reasons[v] ?? "原則値(150V)と緩和条件(300V)の取り違え" }));
    return {
      format: "multiple_choice",
      params: { case_index: { value: caseIndex, realistic_range: [0, CASES.length - 1] } },
      answerValue: c.answer,
      answerUnit: "V",
      answerText,
      choices,
      distractors,
      facts: { caseIndex, answer: c.answer },
      defaultStatement: `${c.cond}における対地電圧の上限〔V〕として定められている値は?`,
      defaultSolution: [
        `電技解釈第143条: 住宅の屋内電路の対地電圧は原則150V以下。2kW以上の機器を専用回路（専用の開閉器・過電流遮断器＋漏電遮断器・電線直接接続）で施設する等の条件を満たすと300V以下にできる`,
        `本問は「${c.cond}」`,
        `=${answerText}V`,
      ],
      physicallyValid: true,
    };
  },
});
