/**
 * テンプレート: 直流分巻電動機の逆起電力（機械・multiple_choice 形式）。
 *   E = V − Ia·Ra   〔V〕   (V=端子電圧, Ia=電機子電流, Ra=電機子抵抗)
 * 正解はコードで算出。誤答は典型ミス（発電機式で加算・Ra無視・電圧降下そのものと混同）。
 */
import { isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

const VOLT = [100, 110, 200, 220]; // 端子電圧 [V]
const IA = [5, 10, 20, 25, 50]; // 電機子電流 [A]
const RA = [0.1, 0.2, 0.4, 0.5, 1]; // 電機子抵抗 [Ω]

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function fmt(v: number): string {
  return String(Number(v.toFixed(2)));
}

function buildFrom(V: number, Ia: number, Ra: number): GenerationResult | null {
  if (V <= 0 || Ia <= 0 || Ra <= 0) return null;
  const drop = Ia * Ra;
  const E = V - drop; // 逆起電力（電動機）
  if (E <= 0) return null; // 物理的に成立しない（降下が端子電圧以上）

  const asGenerator = V + drop; // 発電機式（符号ミス）
  const ignoreRa = V; // Ra を無視し端子電圧のまま
  const dropOnly = drop; // 電圧降下そのものと混同

  const vals = [E, asGenerator, ignoreRa, dropOnly];
  if (!vals.every((v) => v > 0 && isCleanAnswer(v))) return null;
  const texts = new Set(vals.map(fmt));
  if (texts.size !== 4) return null;

  const answerText = fmt(E);
  const choices = [...texts].sort((a, b) => Number(a) - Number(b));

  // 電圧降下が端子電圧に対して大きいほど（Ra や Ia が大きい）思考の負荷が増える。
  const difficulty = drop / V >= 0.1 ? 3 : 2;

  return {
    difficulty,
    params: {
      terminal_voltage: { value: V, unit: "V", realistic_range: [10, 1000] },
      armature_current: { value: Ia, unit: "A", realistic_range: [1, 200] },
      armature_resistance: { value: Ra, unit: "ohm", realistic_range: [0.01, 5] },
    },
    answerValue: E,
    answerUnit: "V",
    answerText,
    choices,
    distractors: [
      { text: fmt(asGenerator), reason: "発電機式 E=V+Ia·Ra と取り違え（符号ミス）" },
      { text: fmt(ignoreRa), reason: "電機子抵抗の電圧降下 Ia·Ra を無視" },
      { text: fmt(dropOnly), reason: "逆起電力ではなく電圧降下 Ia·Ra を答えた" },
    ],
    likelyWrongChoice: fmt(asGenerator),
    facts: { V, Ia, Ra, drop, E },
    defaultStatement:
      `端子電圧${V}Vの直流分巻電動機が、電機子電流${Ia}A、電機子抵抗${Ra}Ωで運転している。` +
      `電機子の逆起電力E〔V〕は?`,
    defaultSolution: [
      "電動機の逆起電力: E = V − Ia·Ra",
      `電機子降下 Ia·Ra = ${Ia}·${Ra} = ${fmt(drop)} V`,
      `E = ${V} − ${fmt(drop)} = ${answerText} V`,
    ],
    physicallyValid: true,
  };
}

export const dcMotorEmf: Template = {
  topic: "直流電動機の逆起電力",
  subject: "機械",
  exam: "denken3",
  difficulty: 2,
  paramSpecs: {
    terminal_voltage: { unit: "V", realistic_range: [10, 1000] },
    armature_current: { unit: "A", realistic_range: [1, 200] },
    armature_resistance: { unit: "ohm", realistic_range: [0.01, 5] },
  },
  generate(rng) {
    return buildFrom(pick(VOLT, rng), pick(IA, rng), pick(RA, rng));
  },
  generateFrom(params) {
    const { terminal_voltage, armature_current, armature_resistance } = params;
    if (terminal_voltage === undefined || armature_current === undefined || armature_resistance === undefined) {
      return null;
    }
    return buildFrom(terminal_voltage, armature_current, armature_resistance);
  },
};
