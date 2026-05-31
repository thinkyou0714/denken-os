/**
 * テンプレート: 接地工事の種類と接地抵抗の上限（電気設備技術基準の解釈 第17条）。
 *
 *   A種: 10Ω以下（高圧・特別高圧機器の鉄台等）
 *   C種: 10Ω以下（300V超の低圧。0.5秒以内自動遮断で 500Ω以下に緩和）
 *   D種: 100Ω以下（300V以下の低圧。0.5秒以内自動遮断で 500Ω以下に緩和）
 */
import type { GenerationResult, Template } from "./types.js";

const CHOICES = ["10", "100", "300", "500"];
interface GType {
  name: string;
  limit: string;
}
const TYPES: ReadonlyArray<GType> = [
  { name: "A種", limit: "10" },
  { name: "C種", limit: "10" },
  { name: "D種", limit: "100" },
];

function buildFrom(idx: number): GenerationResult | null {
  if (!Number.isInteger(idx) || idx < 0 || idx >= TYPES.length) return null;
  const t = TYPES[idx]!;
  const answer = t.limit;
  const reasonFor = (c: string): string => {
    if (c === "10") return "A種・C種の値（D種は100Ω以下）";
    if (c === "100") return "D種接地工事の値（A種・C種は10Ω以下）";
    if (c === "300") return "接地抵抗の基準値として規定されていない";
    return "0.5秒以内に自動遮断する装置を施設した場合の緩和値（原則値ではない）";
  };
  const distractors = CHOICES.filter((c) => c !== answer).map((c) => ({ text: c, reason: reasonFor(c) }));

  return {
    format: "multiple_choice",
    params: { type_index: { value: idx, unit: "", realistic_range: [0, TYPES.length - 1] } },
    answerValue: Number(answer),
    answerUnit: "Ω",
    answerText: answer,
    choices: CHOICES,
    distractors,
    likelyWrongChoice: distractors[0]!.text,
    facts: { type: t.name, answer },
    defaultStatement: `${t.name}接地工事に要求される接地抵抗値の原則上限〔Ω〕は?`,
    defaultSolution: [
      `電技解釈 第17条: A種・C種は10Ω以下、D種は100Ω以下（C・D種は0.5秒遮断で500Ωに緩和）`,
      `${t.name} → ${answer}Ω 以下`,
    ],
    physicallyValid: true,
  };
}

export const groundingTypes: Template = {
  topic: "A種・C種・D種接地抵抗",
  subject: "法規",
  exam: "denken3",
  difficulty: 2,
  meta: {
    tags: ["法規", "接地工事", "接地抵抗", "電技解釈"],
    formulas: ["A種・C種:10Ω以下", "D種:100Ω以下", "C/D種は0.5秒遮断で500Ω以下に緩和"],
    learningObjectives: ["接地工事の種類ごとの接地抵抗上限を区別できる"],
    hints: ["A種・C種は10Ω、D種は100Ω", "高圧側がA種、低圧300V超がC種、300V以下がD種", "速やかな遮断で500Ωに緩和"],
    prerequisites: ["B種接地抵抗"],
    relatedTopics: ["B種接地抵抗", "低圧電路の絶縁抵抗"],
    estimatedTimeSec: 75,
    cognitiveLevel: "remember",
    references: [{ label: "電気設備技術基準の解釈 第17条", article: "接地工事の種類及び施設方法" }],
  },
  paramSpecs: { type_index: { unit: "", realistic_range: [0, TYPES.length - 1] } },
  generate(rng) {
    return buildFrom(Math.floor(rng() * TYPES.length));
  },
  generateFrom(params) {
    const { type_index } = params;
    if (type_index === undefined) return null;
    return buildFrom(type_index);
  },
};
