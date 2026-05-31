/**
 * テンプレート: 電磁誘導（ファラデーの法則・誘導起電力）。
 *
 * 閉形式: e = N·ΔΦ/Δt   〔V〕   （N=巻数, ΔΦ=磁束変化, Δt=時間）
 *
 * 誤答（成立する典型ミス）:
 *   ① ΔΦ/Δt    巻数 N を掛け忘れた
 *   ② N·ΔΦ     時間 Δt で割り忘れた
 *   ③ N·ΔΦ·Δt  Δt で割るところを掛けた
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

// [N, ΔΦ(Wb), Δt(s)]。e, ΔΦ/Δt, N·ΔΦ, N·ΔΦ·Δt が綺麗かつ相異なる組。
const SETS: ReadonlyArray<readonly [number, number, number]> = [
  [200, 0.03, 0.2],
  [100, 0.04, 0.2],
  [50, 0.04, 0.1],
  [200, 0.05, 0.1],
  [400, 0.05, 0.2],
  [100, 0.06, 0.3],
  [300, 0.04, 0.2],
  [200, 0.04, 0.4],
];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(N: number, dPhi: number, dt: number): GenerationResult | null {
  if (N <= 0 || dPhi <= 0 || dt <= 0) return null;
  const e = (N * dPhi) / dt; // 正解
  const noN = dPhi / dt; // ①
  const noDt = N * dPhi; // ②
  const mulDt = N * dPhi * dt; // ③

  const vals = [e, noN, noDt, mulDt];
  if (!vals.every((v) => isCleanAnswer(v))) return null;
  const answerText = formatClean(e);
  const texts = new Set(vals.map((v) => formatClean(v)));
  if (texts.size !== 4) return null;

  const choices = [...texts].sort((a, b) => Number(a) - Number(b));
  return {
    params: {
      turns: { value: N, unit: "", realistic_range: [1, 5000] },
      flux_change_wb: { value: dPhi, unit: "Wb", realistic_range: [0.001, 1] },
      time_s: { value: dt, unit: "s", realistic_range: [0.01, 10] },
    },
    answerValue: e,
    answerUnit: "V",
    answerText,
    choices,
    distractors: [
      { text: formatClean(noN), reason: "巻数 N を掛け忘れた" },
      { text: formatClean(noDt), reason: "時間 Δt で割り忘れた" },
      { text: formatClean(mulDt), reason: "Δt で割るべきところを掛けた" },
    ],
    likelyWrongChoice: formatClean(noN),
    facts: { N, dPhi, dt, e },
    defaultStatement:
      `巻数 ${N} 回のコイルを貫く磁束が ${dt}s の間に ${dPhi}Wb 変化した。` +
      `コイルに生じる誘導起電力 e〔V〕の大きさは?`,
    defaultSolution: [`e = N·ΔΦ/Δt`, `= ${N} × ${dPhi}/${dt}`, `e = ${answerText} V`],
    physicallyValid: true,
  };
}

export const electromagneticInduction: Template = {
  topic: "電磁誘導",
  subject: "理論",
  exam: "denken3",
  difficulty: 2,
  meta: {
    tags: ["理論", "磁気", "電磁誘導", "ファラデーの法則"],
    formulas: ["e = N·ΔΦ/Δt 〔V〕", "e = B·L·v（運動導体）"],
    learningObjectives: ["磁束変化から誘導起電力の大きさを求められる"],
    hints: ["起電力は磁束の時間変化率に比例", "巻数 N を掛ける", "Δt で割る（時間あたり）"],
    prerequisites: ["磁界（アンペアの法則）"],
    relatedTopics: ["電磁力", "直流発電機の誘導起電力"],
    estimatedTimeSec: 120,
    cognitiveLevel: "apply",
  },
  paramSpecs: {
    turns: { unit: "", realistic_range: [1, 5000] },
    flux_change_wb: { unit: "Wb", realistic_range: [0.001, 1] },
    time_s: { unit: "s", realistic_range: [0.01, 10] },
  },
  generate(rng) {
    const [N, dPhi, dt] = pick(SETS, rng);
    return buildFrom(N, dPhi, dt);
  },
  generateFrom(params) {
    const { turns, flux_change_wb, time_s } = params;
    if (turns === undefined || flux_change_wb === undefined || time_s === undefined) return null;
    return buildFrom(turns, flux_change_wb, time_s);
  },
};
