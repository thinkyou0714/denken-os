/**
 * テンプレート: 力率改善に必要な進相コンデンサ容量。
 *
 * 閉形式: Q_c = P · (tanθ1 − tanθ2)   〔kvar〕
 *   P=有効電力[kW], cosθ1=改善前力率, cosθ2=改善後力率。
 *   tanθ は cosθ から厳密に算出（綺麗な値になる力率の組のみ採用）。
 *
 * numeric 形式（選択肢なし・許容誤差つき）。
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

function tanFromCos(cos: number): number {
  const sin = Math.sqrt(1 - cos * cos);
  return sin / cos;
}

// 改善前→改善後の力率の組（tanθ が綺麗になる 3-4-5 系を中心に）。
const PAIRS: ReadonlyArray<readonly [number, number]> = [
  [0.6, 0.8],
  [0.6, 1.0],
  [0.8, 1.0],
  [0.8, 0.9],
];
// P は tan 差を綺麗にするため 12 の倍数を中心に。
const P_SET: ReadonlyArray<number> = [12, 24, 36, 60, 120, 180, 240];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(P: number, cos1: number, cos2: number): GenerationResult | null {
  if (P <= 0 || cos1 <= 0 || cos2 <= 0 || cos1 > 1 || cos2 > 1) return null;
  if (cos2 <= cos1) return null; // 改善後は力率が上がること
  const Qc = P * (tanFromCos(cos1) - tanFromCos(cos2));
  if (Qc <= 0 || !isCleanAnswer(Qc)) return null;
  const answerText = formatClean(Qc);

  return {
    format: "numeric",
    params: {
      active_power: { value: P, unit: "kW", realistic_range: [1, 1000] },
      pf_before: { value: cos1, unit: "", realistic_range: [0.5, 0.95] },
      pf_after: { value: cos2, unit: "", realistic_range: [0.8, 1.0] },
    },
    answerValue: Qc,
    answerUnit: "kvar",
    answerText,
    facts: { P, cos1, cos2, Qc },
    numericTolerance: 0.1,
    defaultStatement:
      `有効電力 ${P}kW の負荷の力率を ${cos1} から ${cos2} に改善したい。` +
      `必要な進相コンデンサの容量 Q_c〔kvar〕を求めよ。`,
    defaultSolution: [
      `Q_c = P·(tanθ1 − tanθ2)`,
      `tanθ1 = √(1−${cos1}²)/${cos1}, tanθ2 = √(1−${cos2}²)/${cos2}`,
      `Q_c = ${P}×(${formatClean(tanFromCos(cos1), 4)} − ${formatClean(tanFromCos(cos2), 4)})`,
      `Q_c = ${answerText} kvar`,
    ],
    physicallyValid: true,
  };
}

export const powerFactorCorrection: Template = {
  topic: "力率改善用コンデンサ容量",
  subject: "電力",
  exam: "denken3",
  difficulty: 3,
  meta: {
    tags: ["電力", "送配電", "力率改善", "進相コンデンサ"],
    formulas: ["Q_c = P(tanθ1 − tanθ2)", "tanθ = sinθ/cosθ"],
    learningObjectives: ["目標力率に改善するための無効電力の差から必要容量を求められる"],
    hints: ["必要なのは無効電力の差", "Q = P·tanθ", "改善前 tanθ1 から改善後 tanθ2 を引く"],
    prerequisites: ["三相交流電力", "力率"],
    relatedTopics: ["無効電力", "電力用コンデンサ"],
    estimatedTimeSec: 180,
  },
  paramSpecs: {
    active_power: { unit: "kW", realistic_range: [1, 1000] },
    pf_before: { unit: "", realistic_range: [0.5, 0.95] },
    pf_after: { unit: "", realistic_range: [0.8, 1.0] },
  },
  generate(rng) {
    const P = pick(P_SET, rng);
    const [c1, c2] = pick(PAIRS, rng);
    return buildFrom(P, c1, c2);
  },
  generateFrom(params) {
    const { active_power, pf_before, pf_after } = params;
    if (active_power === undefined || pf_before === undefined || pf_after === undefined) return null;
    return buildFrom(active_power, pf_before, pf_after);
  },
};
