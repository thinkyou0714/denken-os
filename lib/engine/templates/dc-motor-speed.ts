/**
 * テンプレート: 直流電動機の回転速度。
 *
 * 閉形式: N = E/(k·Φ) = (V − I_a·R_a)/Kφ   〔min⁻¹〕
 *   逆起電力 E=V−I_a·R_a、Kφ=機械定数（k·Φ）をまとめた値〔V·min/rev〕。
 *
 * 誤答（成立する典型ミス）:
 *   ① V/Kφ            逆起電力 E でなく端子電圧 V を使った（R_a 降下無視）
 *   ② (V+I_a·R_a)/Kφ  電圧降下を引くべきところ足した（発電機と混同）
 *   ③ N/2             機械定数 Kφ を 2 倍に読み違えた（N は Kφ に反比例）
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

// [V, Ia, Ra, Kφ]。V>Ia·Ra。N, V/Kφ, (V+IaRa)/Kφ, N/2 が綺麗かつ相異なる組。
const SETS: ReadonlyArray<readonly [number, number, number, number]> = [
  [100, 10, 0.5, 0.05],
  [200, 20, 0.5, 0.1],
  [100, 10, 1, 0.05],
  [220, 10, 1, 0.1],
  [200, 10, 0.5, 0.1],
  [120, 20, 0.5, 0.05],
  [210, 20, 0.5, 0.1],
];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(V: number, Ia: number, Ra: number, Kphi: number): GenerationResult | null {
  if (V <= 0 || Ia <= 0 || Ra <= 0 || Kphi <= 0) return null;
  const E = V - Ia * Ra;
  if (E <= 0) return null;
  const N = E / Kphi; // 正解
  const useV = V / Kphi; // ①
  const addDrop = (V + Ia * Ra) / Kphi; // ②
  const halfFlux = N / 2; // ③

  const vals = [N, useV, addDrop, halfFlux];
  if (!vals.every((v) => isCleanAnswer(v))) return null;
  const answerText = formatClean(N);
  const texts = new Set(vals.map((v) => formatClean(v)));
  if (texts.size !== 4) return null;

  const choices = [...texts].sort((a, b) => Number(a) - Number(b));
  return {
    params: {
      terminal_voltage: { value: V, unit: "V", realistic_range: [10, 600] },
      armature_current: { value: Ia, unit: "A", realistic_range: [1, 200] },
      armature_resistance: { value: Ra, unit: "ohm", realistic_range: [0.05, 5] },
      machine_constant: { value: Kphi, unit: "V*min/rev", realistic_range: [0.01, 1] },
    },
    answerValue: N,
    answerUnit: "min^-1",
    answerText,
    choices,
    distractors: [
      { text: formatClean(useV), reason: "逆起電力 E でなく端子電圧 V を使った（R_a 降下を無視）" },
      { text: formatClean(addDrop), reason: "電圧降下を引くべきところ足した（発電機の式 E=V+I_aR_a と混同）" },
      { text: formatClean(halfFlux), reason: "機械定数 Kφ を 2 倍に読み違えた（N は Kφ に反比例）" },
    ],
    likelyWrongChoice: formatClean(useV),
    facts: { V, Ia, Ra, Kphi, E, N },
    defaultStatement:
      `端子電圧 ${V}V の直流電動機が電機子電流 ${Ia}A を流している。電機子抵抗 ${Ra}Ω、機械定数 Kφ=${Kphi}〔V·min/rev〕のとき、` +
      `回転速度 N〔min⁻¹〕は?`,
    defaultSolution: [
      `逆起電力 E = V − I_a·R_a = ${V} − ${Ia}×${Ra} = ${formatClean(E)} V`,
      `N = E/Kφ = ${formatClean(E)}/${Kphi}`,
      `N = ${answerText} min⁻¹`,
    ],
    physicallyValid: true,
  };
}

export const dcMotorSpeed: Template = {
  topic: "直流電動機の回転速度",
  subject: "機械",
  exam: "denken3",
  difficulty: 3,
  meta: {
    tags: ["機械", "直流機", "直流電動機", "回転速度"],
    formulas: ["N = (V − I_a·R_a)/(k·Φ)", "E = V − I_a·R_a（電動機）"],
    learningObjectives: ["逆起電力から直流電動機の回転速度を求め、電圧・磁束依存を説明できる"],
    hints: ["まず逆起電力 E=V−I_aR_a", "電動機は『引く』、発電機は『足す』", "N は E に比例・Φ に反比例"],
    prerequisites: ["直流電動機の逆起電力"],
    relatedTopics: ["直流電動機の逆起電力", "直流発電機の誘導起電力"],
    estimatedTimeSec: 150,
    cognitiveLevel: "apply",
  },
  paramSpecs: {
    terminal_voltage: { unit: "V", realistic_range: [10, 600] },
    armature_current: { unit: "A", realistic_range: [1, 200] },
    armature_resistance: { unit: "ohm", realistic_range: [0.05, 5] },
    machine_constant: { unit: "V*min/rev", realistic_range: [0.01, 1] },
  },
  generate(rng) {
    const [V, Ia, Ra, Kphi] = pick(SETS, rng);
    return buildFrom(V, Ia, Ra, Kphi);
  },
  generateFrom(params) {
    const { terminal_voltage, armature_current, armature_resistance, machine_constant } = params;
    if (
      terminal_voltage === undefined ||
      armature_current === undefined ||
      armature_resistance === undefined ||
      machine_constant === undefined
    )
      return null;
    return buildFrom(terminal_voltage, armature_current, armature_resistance, machine_constant);
  },
};
