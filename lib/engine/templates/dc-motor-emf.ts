/**
 * テンプレート: 直流分巻電動機の逆起電力。
 *
 * 閉形式: E = V − I_a·R_a   〔V〕
 *   V=端子電圧, I_a=電機子電流, R_a=電機子抵抗。
 *
 * 誤答（成立する典型ミス）:
 *   ① 発電機と混同     E' = V + I_a·R_a
 *   ② 電圧降下の無視   E' = V
 *   ③ 電圧降下のみ     E' = I_a·R_a
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

const V_SET: ReadonlyArray<number> = [100, 200, 220, 110, 400];
const IA_SET: ReadonlyArray<number> = [5, 10, 20, 25, 40, 50];
const RA_SET: ReadonlyArray<number> = [0.1, 0.2, 0.25, 0.5, 1];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(V: number, Ia: number, Ra: number): GenerationResult | null {
  if (V <= 0 || Ia <= 0 || Ra <= 0) return null;
  const drop = Ia * Ra;
  const E = V - drop; // 正解
  if (E <= 0) return null; // 逆起電力が負は非現実的
  const gen = V + drop; // ①
  const noDrop = V; // ②
  const onlyDrop = drop; // ③

  const vals = [E, gen, noDrop, onlyDrop];
  if (!vals.every((v) => isCleanAnswer(v))) return null;
  const answerText = formatClean(E);
  const texts = new Set(vals.map((v) => formatClean(v)));
  if (texts.size !== 4) return null;

  const choices = [...texts].sort((a, b) => Number(a) - Number(b));
  return {
    params: {
      terminal_voltage: { value: V, unit: "V", realistic_range: [100, 600] },
      armature_current: { value: Ia, unit: "A", realistic_range: [1, 200] },
      armature_resistance: { value: Ra, unit: "ohm", realistic_range: [0.05, 2] },
    },
    answerValue: E,
    answerUnit: "V",
    answerText,
    choices,
    distractors: [
      { text: formatClean(gen), reason: "発電機の式 E=V+I_aR_a と混同した（電動機は −）" },
      { text: formatClean(noDrop), reason: "電機子抵抗による電圧降下を無視した" },
      { text: formatClean(onlyDrop), reason: "電圧降下分のみを答えた" },
    ],
    likelyWrongChoice: formatClean(gen),
    facts: { V, Ia, Ra, E },
    defaultStatement:
      `端子電圧 ${V}V の直流分巻電動機が電機子電流 ${Ia}A で運転している。` +
      `電機子抵抗が ${Ra}Ω のとき逆起電力 E〔V〕は?`,
    defaultSolution: [`電動機では E = V − I_a·R_a`, `= ${V} − ${Ia}×${Ra}`, `E = ${answerText} V`],
    physicallyValid: true,
  };
}

export const dcMotorEmf: Template = {
  topic: "直流電動機の逆起電力",
  subject: "機械",
  exam: "denken3",
  difficulty: 2,
  meta: {
    tags: ["機械", "直流機", "逆起電力", "電機子"],
    formulas: ["電動機: E = V − I_a·R_a", "発電機: E = V + I_a·R_a", "N ∝ E/Φ"],
    learningObjectives: ["直流電動機の逆起電力を端子電圧と電機子降下から求められる"],
    hints: ["電動機は端子電圧から降下を引く", "発電機は足す", "E = V − I_a·R_a"],
    prerequisites: ["オームの法則", "直流機の構造"],
    relatedTopics: ["直流電動機の回転速度", "直流発電機の誘導起電力", "直流電動機のトルク"],
    estimatedTimeSec: 120,
  },
  paramSpecs: {
    terminal_voltage: { unit: "V", realistic_range: [100, 600] },
    armature_current: { unit: "A", realistic_range: [1, 200] },
    armature_resistance: { unit: "ohm", realistic_range: [0.05, 2] },
  },
  generate(rng) {
    const V = pick(V_SET, rng);
    const Ia = pick(IA_SET, rng);
    const Ra = pick(RA_SET, rng);
    return buildFrom(V, Ia, Ra);
  },
  generateFrom(params) {
    const { terminal_voltage, armature_current, armature_resistance } = params;
    if (terminal_voltage === undefined || armature_current === undefined || armature_resistance === undefined)
      return null;
    return buildFrom(terminal_voltage, armature_current, armature_resistance);
  },
};
