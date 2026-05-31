/**
 * テンプレート: 直流発電機の誘導起電力（端子から見た発生電圧）。
 *
 * 閉形式: E = V + I_a·R_a   〔V〕   （発電機は電機子降下を『足す』）
 *
 * 誤答（成立する典型ミス）:
 *   ① V − I_a·R_a  電機子降下を引いた（電動機の式と混同）
 *   ② V            電機子抵抗降下を無視した
 *   ③ I_a·R_a      端子電圧を足し忘れ、電圧降下分だけにした
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

// [V, Ia, Ra]。E=V+IaRa, V−IaRa, V, IaRa が綺麗かつ相異なる組。
const SETS: ReadonlyArray<readonly [number, number, number]> = [
  [200, 20, 0.5],
  [100, 10, 0.5],
  [220, 50, 0.2],
  [200, 50, 0.5],
  [100, 20, 0.5],
  [120, 40, 0.25],
  [210, 20, 0.5],
  [100, 40, 0.1],
];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(V: number, Ia: number, Ra: number): GenerationResult | null {
  if (V <= 0 || Ia <= 0 || Ra <= 0) return null;
  const drop = Ia * Ra;
  const E = V + drop; // 正解
  const asMotor = V - drop; // ①
  const noDrop = V; // ②
  const onlyDrop = drop; // ③
  if (asMotor <= 0) return null;

  const vals = [E, asMotor, noDrop, onlyDrop];
  if (!vals.every((v) => isCleanAnswer(v))) return null;
  const answerText = formatClean(E);
  const texts = new Set(vals.map((v) => formatClean(v)));
  if (texts.size !== 4) return null;

  const choices = [...texts].sort((a, b) => Number(a) - Number(b));
  return {
    params: {
      terminal_voltage: { value: V, unit: "V", realistic_range: [10, 600] },
      armature_current: { value: Ia, unit: "A", realistic_range: [1, 200] },
      armature_resistance: { value: Ra, unit: "ohm", realistic_range: [0.05, 5] },
    },
    answerValue: E,
    answerUnit: "V",
    answerText,
    choices,
    distractors: [
      { text: formatClean(asMotor), reason: "電機子降下を引いた（電動機の式 E=V−I_aR_a と混同。発電機は足す）" },
      { text: formatClean(noDrop), reason: "電機子抵抗降下 I_a·R_a を無視した" },
      { text: formatClean(onlyDrop), reason: "端子電圧を足し忘れ、電圧降下分だけにした" },
    ],
    likelyWrongChoice: formatClean(asMotor),
    facts: { V, Ia, Ra, E },
    defaultStatement:
      `直流発電機が端子電圧 ${V}V、電機子電流 ${Ia}A を出力している。電機子抵抗が ${Ra}Ω のとき、` +
      `電機子に誘導される起電力 E〔V〕は?`,
    defaultSolution: [`発電機は E = V + I_a·R_a`, `= ${V} + ${Ia}×${Ra}`, `E = ${answerText} V`],
    physicallyValid: true,
  };
}

export const dcGeneratorEmf: Template = {
  topic: "直流発電機の誘導起電力",
  subject: "機械",
  exam: "denken3",
  difficulty: 2,
  meta: {
    tags: ["機械", "直流機", "直流発電機", "誘導起電力"],
    formulas: ["E = V + I_a·R_a（発電機）", "E = V − I_a·R_a（電動機）"],
    learningObjectives: ["発電機と電動機で電機子降下の符号が逆になることを理解し計算できる"],
    hints: ["発電機は『足す』、電動機は『引く』", "起電力 E は端子電圧より大きい", "降下は I_a·R_a"],
    prerequisites: ["オームの法則", "直流電動機の逆起電力"],
    relatedTopics: ["直流電動機の逆起電力", "直流電動機の回転速度"],
    estimatedTimeSec: 90,
    cognitiveLevel: "apply",
  },
  paramSpecs: {
    terminal_voltage: { unit: "V", realistic_range: [10, 600] },
    armature_current: { unit: "A", realistic_range: [1, 200] },
    armature_resistance: { unit: "ohm", realistic_range: [0.05, 5] },
  },
  generate(rng) {
    const [V, Ia, Ra] = pick(SETS, rng);
    return buildFrom(V, Ia, Ra);
  },
  generateFrom(params) {
    const { terminal_voltage, armature_current, armature_resistance } = params;
    if (terminal_voltage === undefined || armature_current === undefined || armature_resistance === undefined)
      return null;
    return buildFrom(terminal_voltage, armature_current, armature_resistance);
  },
};
