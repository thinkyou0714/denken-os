/**
 * テンプレート: 低圧電路の絶縁抵抗の最小値（電気設備技術基準 第58条）。
 *
 *   対地電圧 150V以下         → 0.1 MΩ
 *   対地電圧 150V超 300V以下  → 0.2 MΩ
 *   300V超（低圧）            → 0.4 MΩ
 */
import type { GenerationResult, Template } from "./types.js";

const CHOICES = ["0.1", "0.2", "0.3", "0.4"]; // 0.3 は実在しないダミー区分
const VOLTAGES: ReadonlyArray<number> = [100, 105, 150, 200, 220, 250, 300, 400, 440];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function minInsulation(v: number): string {
  if (v <= 150) return "0.1";
  if (v <= 300) return "0.2";
  return "0.4";
}

function buildFrom(v: number): GenerationResult | null {
  if (!(v > 0) || v > 600) return null;
  const answer = minInsulation(v);
  const reasonFor = (c: string): string => {
    if (c === "0.3") return "0.3 MΩ という区分は存在しない（基準値は 0.1/0.2/0.4 MΩ）";
    if (c === "0.1") return "対地電圧 150V を超えるので 0.1 MΩ では不足";
    if (c === "0.2") return v <= 150 ? "150V 以下なので 0.1 MΩ で足りる" : "300V を超えるので 0.2 MΩ では不足";
    return "300V 以下なので 0.4 MΩ は不要";
  };
  const distractors = CHOICES.filter((c) => c !== answer).map((c) => ({ text: c, reason: reasonFor(c) }));

  return {
    format: "multiple_choice",
    params: { earth_voltage: { value: v, unit: "V", realistic_range: [1, 600] } },
    answerValue: Number(answer),
    answerUnit: "MΩ",
    answerText: answer,
    choices: CHOICES,
    distractors,
    likelyWrongChoice: distractors[0]!.text,
    facts: { earth_voltage: v, answer },
    defaultStatement: `対地電圧 ${v}V の低圧電路に要求される絶縁抵抗の最小値〔MΩ〕は?`,
    defaultSolution: [`電技 第58条: 150V以下→0.1、150V超300V以下→0.2、300V超→0.4 MΩ`, `対地電圧 ${v}V → ${answer} MΩ`],
    physicallyValid: true,
  };
}

export const insulationResistance: Template = {
  topic: "低圧電路の絶縁抵抗",
  subject: "法規",
  exam: "denken3",
  difficulty: 2,
  meta: {
    tags: ["法規", "電気設備技術基準", "絶縁抵抗", "低圧"],
    formulas: ["≤150V:0.1 / 150〜300V:0.2 / >300V:0.4 〔MΩ〕"],
    learningObjectives: ["対地電圧から低圧電路の最小絶縁抵抗値を判別できる"],
    hints: ["境界は 150V と 300V", "対地電圧で判定（線間ではない）", "0.1/0.2/0.4 の3段階"],
    prerequisites: ["電圧の区分"],
    relatedTopics: ["絶縁耐力試験電圧", "B種接地抵抗"],
    estimatedTimeSec: 75,
    cognitiveLevel: "remember",
    references: [{ label: "電気設備技術基準 第58条", article: "低圧電路の絶縁性能" }],
  },
  paramSpecs: { earth_voltage: { unit: "V", realistic_range: [1, 600] } },
  generate(rng) {
    return buildFrom(pick(VOLTAGES, rng));
  },
  generateFrom(params) {
    const { earth_voltage } = params;
    if (earth_voltage === undefined) return null;
    return buildFrom(earth_voltage);
  },
};
