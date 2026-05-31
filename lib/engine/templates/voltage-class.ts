/**
 * テンプレート: 電圧の区分（電気設備技術基準 第2条）。
 *
 *   交流: 低圧 600V以下 / 高圧 600V超〜7000V以下 / 特別高圧 7000V超
 *   直流: 低圧 750V以下 / 高圧 750V超〜7000V以下 / 特別高圧 7000V超
 */
import type { GenerationResult, Template } from "./types.js";

const LOW = "低圧";
const HIGH = "高圧";
const EXTRA = "特別高圧";
const CHOICES = [LOW, HIGH, EXTRA];

// [電圧V, 直流フラグ(1=DC)]。
const SETS: ReadonlyArray<readonly [number, number]> = [
  [100, 0],
  [200, 0],
  [400, 0],
  [600, 0],
  [3300, 0],
  [6600, 0],
  [7000, 0],
  [22000, 0],
  [66000, 0],
  [154000, 0],
  [100, 1],
  [750, 1],
  [1500, 1],
  [3000, 1],
  [7000, 1],
  [22000, 1],
];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function classify(v: number, dc: boolean): string {
  const lowMax = dc ? 750 : 600;
  if (v <= lowMax) return LOW;
  if (v <= 7000) return HIGH;
  return EXTRA;
}

function buildFrom(v: number, dcFlag: number): GenerationResult | null {
  if (!(v > 0)) return null;
  const dc = dcFlag >= 1;
  const lowMax = dc ? 750 : 600;
  const answer = classify(v, dc);
  const reasonFor = (c: string): string => {
    if (c === LOW) return `${lowMax}V を超えるので低圧ではない`;
    if (c === HIGH) return v <= lowMax ? `${lowMax}V 以下なので高圧でなく低圧` : "7000V を超えるので高圧でなく特別高圧";
    return "7000V 以下なので特別高圧ではない";
  };
  const distractors = CHOICES.filter((c) => c !== answer).map((c) => ({ text: c, reason: reasonFor(c) }));

  const kind = dc ? "直流" : "交流";
  return {
    format: "multiple_choice",
    params: {
      voltage: { value: v, unit: "V", realistic_range: [1, 500000] },
      is_dc: { value: dcFlag, unit: "", realistic_range: [0, 1] },
    },
    answerValue: v,
    answerUnit: "",
    answerText: answer,
    choices: CHOICES,
    distractors,
    likelyWrongChoice: distractors[0]!.text,
    facts: { voltage: v, kind, answer },
    defaultStatement: `${kind} ${v.toLocaleString("en-US")}V は、電気設備技術基準上どの電圧区分に該当するか。`,
    defaultSolution: [
      `${kind}の低圧上限は ${lowMax}V、高圧は7000V以下、それを超えると特別高圧（電技 第2条）`,
      `${kind} ${v.toLocaleString("en-US")}V → ${answer}`,
    ],
    physicallyValid: true,
  };
}

export const voltageClass: Template = {
  topic: "電圧の区分",
  subject: "法規",
  exam: "denken3",
  difficulty: 1,
  meta: {
    tags: ["法規", "電気設備技術基準", "電圧区分"],
    formulas: ["交流 低圧≤600V / 直流 低圧≤750V", "高圧≤7000V / 特別高圧>7000V"],
    learningObjectives: ["交流・直流の電圧区分（低圧/高圧/特別高圧）の境界を判別できる"],
    hints: ["交流600V・直流750Vが低圧上限", "7000Vが高圧/特別高圧の境界", "交直で低圧上限が違う"],
    prerequisites: [],
    relatedTopics: ["電気事業法（主任技術者）", "最大使用電圧"],
    estimatedTimeSec: 60,
    cognitiveLevel: "remember",
    references: [{ label: "電気設備技術基準 第2条", article: "電圧の種別" }],
  },
  paramSpecs: {
    voltage: { unit: "V", realistic_range: [1, 500000] },
    is_dc: { unit: "", realistic_range: [0, 1] },
  },
  generate(rng) {
    const [v, dc] = pick(SETS, rng);
    return buildFrom(v, dc);
  },
  generateFrom(params) {
    const { voltage, is_dc } = params;
    if (voltage === undefined) return null;
    return buildFrom(voltage, is_dc ?? 0);
  },
};
