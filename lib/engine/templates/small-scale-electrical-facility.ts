/**
 * テンプレート: 小規模事業用電気工作物の範囲（法規・multiple_choice）。
 *   2023年3月施行の改正電気事業法施行規則: 太陽光10kW以上50kW未満・風力20kW未満が
 *   小規模事業用電気工作物（技術基準適合維持・基礎情報の届出・使用前自己確認の義務）。
 */
import { formatClean } from "../clean.js";
import { defineTemplate } from "./helpers.js";

interface Case {
  question: string;
  answer: number;
  pool: ReadonlyArray<number>;
}

const CASES: ReadonlyArray<Case> = [
  {
    question: "太陽電池発電設備が小規模事業用電気工作物となる出力の下限〔kW〕",
    answer: 10,
    pool: [10, 20, 50, 100, 500],
  },
  {
    question: "太陽電池発電設備が小規模事業用電気工作物となる出力の上限（この値未満）〔kW〕",
    answer: 50,
    pool: [10, 20, 50, 100, 500],
  },
  {
    question: "風力発電設備が小規模事業用電気工作物となる出力の上限（この値未満）〔kW〕",
    answer: 20,
    pool: [10, 20, 50, 100, 500],
  },
];

type Params = {
  case_index: number;
};

export const smallScaleElectricalFacility = defineTemplate<Params>({
  topic: "小規模事業用電気工作物の範囲",
  subject: "法規",
  exam: "denken2_primary",
  difficulty: 2,
  pastExam: {
    area: "電気事業法・電気工作物",
    frequency: "mid",
    years: [2023, 2024],
    note: "2023年3月施行。太陽光10kW以上50kW未満・風力20kW未満が小規模事業用電気工作物（技術基準適合・基礎情報届出・使用前自己確認の義務）",
  },
  paramSpecs: { case_index: { realistic_range: [0, 2] } },
  paramOrder: ["case_index"],
  draw(rng) {
    return { case_index: Math.floor(rng() * 3) };
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
        reason: "太陽光/風力の出力区分（太陽光10kW以上50kW未満・風力20kW未満）の取り違え",
      }));
    return {
      format: "multiple_choice",
      params: { case_index: { value: caseIndex, realistic_range: [0, 2] } },
      answerValue: c.answer,
      answerUnit: "kW",
      answerText,
      choices,
      distractors,
      facts: { caseIndex, answer: c.answer },
      defaultStatement: `2023年3月施行の改正電気事業法施行規則に基づき、${c.question}は?`,
      defaultSolution: [
        `小規模事業用電気工作物（2023年3月施行）: 太陽光10kW以上50kW未満・風力20kW未満`,
        `技術基準適合維持・基礎情報の届出・使用前自己確認が義務`,
        `本問の答え = ${answerText}kW`,
      ],
      physicallyValid: true,
    };
  },
});
