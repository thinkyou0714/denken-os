/**
 * テンプレート: 直流電動機の逆起電力（機械・numeric 形式）。
 *   逆起電力 E〔V〕 = 端子電圧 V − 電機子電流 Ia × 電機子抵抗 Ra
 * 電機子回路の電圧方程式 V = E + Ia·Ra を E について解いた基本式。正解はコードで算出し、
 * E>0（V > Ia·Ra、電動機として成立）かつ綺麗な値になる組のみ採用する。
 *
 * 決定論: 答えは (V, Ia, Ra) だけで決まる純計算なので generateFrom が generate を再現する。
 */
import { isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

const VOLT = [100, 200, 220]; // 端子電圧 V
const ARM_CURRENT = [10, 20, 50]; // 電機子電流 A
const ARM_RES = [0.1, 0.2, 0.5]; // 電機子抵抗 Ω

const V_RANGE: [number, number] = [10, 1000];
const IA_RANGE: [number, number] = [1, 500];
const RA_RANGE: [number, number] = [0.01, 10];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(v: number, ia: number, ra: number): GenerationResult | null {
  if (![v, ia, ra].every((x) => Number.isFinite(x) && x > 0)) return null;
  const e = v - ia * ra; // 逆起電力
  if (e <= 0) return null; // 電動機として成立しない（逆起電力は正）
  if (!isCleanAnswer(e)) return null;
  const answerText = String(Number(e.toFixed(2)));
  return {
    format: "numeric",
    params: {
      terminal_voltage: { value: v, unit: "V", realistic_range: V_RANGE },
      armature_current: { value: ia, unit: "A", realistic_range: IA_RANGE },
      armature_resistance: { value: ra, unit: "Ω", realistic_range: RA_RANGE },
    },
    answerValue: e,
    answerUnit: "V",
    answerText,
    facts: { v, ia, ra, e },
    defaultStatement:
      `端子電圧${v}V の直流電動機が電機子電流${ia}A で運転している。電機子抵抗が${ra}Ω のとき、` +
      `逆起電力E〔V〕を求めよ。`,
    defaultSolution: [
      "電機子回路の電圧方程式 V = E + Ia·Ra より E = V − Ia·Ra",
      `= ${v} − ${ia} × ${ra}`,
      `= ${answerText} V`,
    ],
    physicallyValid: e > 0 && e < v,
  };
}

export const dcMotorBackEmf: Template = {
  topic: "直流電動機の逆起電力",
  subject: "機械",
  exam: "denken3",
  difficulty: 2,
  paramSpecs: {
    terminal_voltage: { unit: "V", realistic_range: V_RANGE },
    armature_current: { unit: "A", realistic_range: IA_RANGE },
    armature_resistance: { unit: "Ω", realistic_range: RA_RANGE },
  },
  generate(rng) {
    return buildFrom(pick(VOLT, rng), pick(ARM_CURRENT, rng), pick(ARM_RES, rng));
  },
  generateFrom(params) {
    const { terminal_voltage, armature_current, armature_resistance } = params;
    if (terminal_voltage === undefined || armature_current === undefined || armature_resistance === undefined) {
      return null;
    }
    return buildFrom(terminal_voltage, armature_current, armature_resistance);
  },
};
