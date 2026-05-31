/**
 * テンプレート: 電気主任技術者免状の監督範囲（電気事業法施行規則 第56条）。
 *
 * 事業用電気工作物の電圧に応じて選任に必要な最小限の免状種別を問う。
 *   第三種: 電圧 5 万 V 未満
 *   第二種: 電圧 17 万 V 未満
 *   第一種: 制限なし（すべて）
 */
import type { GenerationResult, Template } from "./types.js";

const DAI3 = "第三種電気主任技術者";
const DAI2 = "第二種電気主任技術者";
const DAI1 = "第一種電気主任技術者";
const KOJI = "第一種電気工事士";
const CHOICES = [DAI1, DAI2, DAI3, KOJI];

// 監督可能上限電圧 [V]。
const CAP: Record<string, number> = { [DAI3]: 50_000, [DAI2]: 170_000, [DAI1]: Number.POSITIVE_INFINITY };
const VOLTAGES: ReadonlyArray<number> = [6_600, 22_000, 33_000, 66_000, 154_000, 187_000, 275_000, 500_000];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function minLicense(v: number): string {
  if (v < CAP[DAI3]!) return DAI3;
  if (v < CAP[DAI2]!) return DAI2;
  return DAI1;
}

function buildFrom(v: number): GenerationResult | null {
  if (!(v > 0)) return null;
  const answer = minLicense(v);
  const distractors = CHOICES.filter((c) => c !== answer).map((c) => {
    let reason: string;
    if (c === KOJI) reason = "電気工事士は工事の資格であり、事業用電気工作物の保安監督（主任技術者）ではない";
    else if (CAP[c]! > v) reason = `${c}でも選任可能だが、この電圧では過剰（問われているのは必要最小限の種別）`;
    else reason = `${c}の監督範囲（上限電圧）を超えており、この電圧の工作物は監督できない`;
    return { text: c, reason };
  });

  return {
    format: "multiple_choice",
    params: { voltage: { value: v, unit: "V", realistic_range: [100, 500_000] } },
    answerValue: v,
    answerUnit: "",
    answerText: answer,
    choices: CHOICES,
    distractors,
    likelyWrongChoice: distractors[0]!.text,
    facts: { voltage: v, answer },
    defaultStatement:
      `最大電圧 ${v.toLocaleString("en-US")}V の事業用電気工作物の工事・維持・運用の保安監督をするために、` +
      `選任できる必要最小限の主任技術者免状の種別はどれか。`,
    defaultSolution: [
      `第三種は5万V未満、第二種は17万V未満、第一種は制限なし（電気事業法施行規則 第56条）`,
      `${v.toLocaleString("en-US")}V を監督できる最小限の種別は ${answer}`,
    ],
    physicallyValid: true,
  };
}

export const chiefEngineer: Template = {
  topic: "電気事業法（主任技術者）",
  subject: "法規",
  exam: "denken3",
  difficulty: 2,
  meta: {
    tags: ["法規", "電気事業法", "主任技術者", "保安監督"],
    formulas: ["第三種<5万V / 第二種<17万V / 第一種=制限なし"],
    learningObjectives: ["電圧に応じた電気主任技術者免状の監督範囲を判別できる"],
    hints: ["5万V・17万V が境界", "第三種→第二種→第一種で範囲拡大", "工事士は主任技術者ではない"],
    prerequisites: ["電圧の区分"],
    relatedTopics: ["電圧の区分", "高圧受電設備"],
    estimatedTimeSec: 90,
    cognitiveLevel: "remember",
    references: [{ label: "電気事業法施行規則 第56条", article: "主任技術者免状の種類と監督範囲" }],
  },
  paramSpecs: { voltage: { unit: "V", realistic_range: [100, 500_000] } },
  generate(rng) {
    return buildFrom(pick(VOLTAGES, rng));
  },
  generateFrom(params) {
    const { voltage } = params;
    if (voltage === undefined) return null;
    return buildFrom(voltage);
  },
};
