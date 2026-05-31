/**
 * テンプレート: 電熱（水の加熱に必要な電力量）。
 *
 * 閉形式: W = c·m·ΔT/η   〔kJ〕   （c=4.2 kJ/(kg·K)、ΔT=温度上昇、η=加熱効率）
 *
 * 誤答（成立する典型ミス）:
 *   ① c·m·ΔT      効率 η を無視した（割らなかった）
 *   ② c·m·ΔT·η    効率で割るべきところを掛けた
 *   ③ c·m·T_f/η   温度差でなく最終温度 T_f を使った（初期温度を引き忘れ）
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

const C = 4.2; // 水の比熱 kJ/(kg·K)
// [m(kg), T初(℃), T終(℃), η]。W, noEta, mulEta, useFinal が綺麗かつ相異なる組。
const SETS: ReadonlyArray<readonly [number, number, number, number]> = [
  [10, 20, 100, 0.7],
  [20, 20, 100, 0.7],
  [5, 20, 100, 0.7],
  [10, 20, 100, 0.84],
  [10, 20, 80, 0.7],
  [10, 20, 100, 0.6],
  [20, 40, 100, 0.84],
  [5, 10, 90, 0.7],
];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(m: number, t0: number, tf: number, eta: number): GenerationResult | null {
  if (m <= 0 || eta <= 0 || eta >= 1 || tf <= t0) return null;
  const dT = tf - t0;
  const W = (C * m * dT) / eta; // 正解
  const noEta = C * m * dT; // ①
  const mulEta = C * m * dT * eta; // ②
  const useFinal = (C * m * tf) / eta; // ③

  const vals = [W, noEta, mulEta, useFinal];
  if (!vals.every((v) => isCleanAnswer(v))) return null;
  const answerText = formatClean(W);
  const texts = new Set(vals.map((v) => formatClean(v)));
  if (texts.size !== 4) return null;

  const choices = [...texts].sort((a, b) => Number(a) - Number(b));
  return {
    params: {
      mass: { value: m, unit: "kg", realistic_range: [1, 500] },
      temp_initial: { value: t0, unit: "degC", realistic_range: [0, 90] },
      temp_final: { value: tf, unit: "degC", realistic_range: [10, 100] },
      efficiency: { value: eta, unit: "", realistic_range: [0.5, 0.95] },
    },
    answerValue: W,
    answerUnit: "kJ",
    answerText,
    choices,
    distractors: [
      { text: formatClean(noEta), reason: "加熱効率 η を無視した（割らなかった）" },
      { text: formatClean(mulEta), reason: "効率で割るべきところを掛けた" },
      { text: formatClean(useFinal), reason: "温度差 ΔT でなく最終温度をそのまま使った（初期温度を引き忘れ）" },
    ],
    likelyWrongChoice: formatClean(noEta),
    facts: { m, t0, tf, dT, eta, W },
    defaultStatement:
      `${t0}℃ の水 ${m}kg を ${tf}℃ まで加熱する。加熱効率を ${eta} とするとき、必要な電力量 W〔kJ〕は? ` +
      `（水の比熱 4.2 kJ/(kg·K)）`,
    defaultSolution: [
      `必要熱量 Q = c·m·ΔT = 4.2 × ${m} × (${tf}−${t0}) = ${formatClean(noEta)} kJ`,
      `効率を考慮 W = Q/η = ${formatClean(noEta)}/${eta}`,
      `W = ${answerText} kJ`,
    ],
    physicallyValid: true,
  };
}

export const electricHeating: Template = {
  topic: "電熱（必要電力量）",
  subject: "機械",
  exam: "denken3",
  difficulty: 3,
  meta: {
    tags: ["機械", "電熱", "ジュール熱", "効率"],
    formulas: ["Q = c·m·ΔT 〔kJ〕", "W = Q/η", "1 kWh = 3600 kJ"],
    learningObjectives: ["比熱と効率から加熱に必要な電力量を求められる"],
    hints: ["温度差 ΔT は『終−初』", "効率は分母（余計に要る）", "水の比熱 4.2 kJ/(kg·K)"],
    prerequisites: ["熱量と比熱", "効率の定義"],
    relatedTopics: ["照度計算（逆二乗則）", "火力発電の熱効率"],
    estimatedTimeSec: 150,
    cognitiveLevel: "apply",
  },
  paramSpecs: {
    mass: { unit: "kg", realistic_range: [1, 500] },
    temp_initial: { unit: "degC", realistic_range: [0, 90] },
    temp_final: { unit: "degC", realistic_range: [10, 100] },
    efficiency: { unit: "", realistic_range: [0.5, 0.95] },
  },
  generate(rng) {
    const [m, t0, tf, eta] = pick(SETS, rng);
    return buildFrom(m, t0, tf, eta);
  },
  generateFrom(params) {
    const { mass, temp_initial, temp_final, efficiency } = params;
    if (mass === undefined || temp_initial === undefined || temp_final === undefined || efficiency === undefined)
      return null;
    return buildFrom(mass, temp_initial, temp_final, efficiency);
  },
};
