/**
 * テンプレート: 点光源の法線照度（距離の逆二乗則）。
 *
 * 閉形式: E = I/r²   〔lx〕   （I=光度 cd、r=光源からの距離 m、光源直下=法線照度）
 *
 * 誤答（成立する典型ミス）:
 *   ① I/r       距離の二乗を忘れ r で割った
 *   ② 2·E       係数を 2 倍にした
 *   ③ E/4       距離を 2 倍に読み違えた（E∝1/r² なので 1/4）
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

// [I(cd), r(m)]。r=2 は I/r と 2E が衝突するため除外。E, I/r, 2E, E/4 が綺麗かつ相異なる組。
const SETS: ReadonlyArray<readonly [number, number]> = [
  [900, 3],
  [1600, 4],
  [2500, 5],
  [450, 3],
  [800, 4],
  [3600, 3],
  [1800, 3],
  [1250, 5],
  [3200, 4],
  [1200, 4],
];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(I: number, r: number): GenerationResult | null {
  if (I <= 0 || r <= 0) return null;
  const E = I / (r * r); // 正解
  const noSquare = I / r; // ①
  const dbl = 2 * E; // ②
  const quarter = E / 4; // ③（距離2倍）

  const vals = [E, noSquare, dbl, quarter];
  if (!vals.every((v) => isCleanAnswer(v))) return null;
  const answerText = formatClean(E);
  const texts = new Set(vals.map((v) => formatClean(v)));
  if (texts.size !== 4) return null;

  const choices = [...texts].sort((a, b) => Number(a) - Number(b));
  return {
    params: {
      luminous_intensity: { value: I, unit: "cd", realistic_range: [10, 10000] },
      distance_m: { value: r, unit: "m", realistic_range: [0.5, 20] },
    },
    answerValue: E,
    answerUnit: "lx",
    answerText,
    choices,
    distractors: [
      { text: formatClean(noSquare), reason: "距離の二乗を忘れ、r で割った（照度は距離の逆二乗）" },
      { text: formatClean(dbl), reason: "係数を 2 倍にした" },
      { text: formatClean(quarter), reason: "距離を 2 倍に読み違えた（E∝1/r² なので 1/4）" },
    ],
    likelyWrongChoice: formatClean(noSquare),
    facts: { I, r, E },
    defaultStatement: `光度 ${I}cd の点光源の直下 ${r}m の水平面における法線照度 E〔lx〕は?`,
    defaultSolution: [`逆二乗則 E = I/r²`, `= ${I}/${r}²`, `E = ${answerText} lx`],
    physicallyValid: true,
  };
}

export const illuminance: Template = {
  topic: "照度計算（逆二乗則）",
  subject: "機械",
  exam: "denken3",
  difficulty: 2,
  meta: {
    tags: ["機械", "照明", "照度", "逆二乗則"],
    formulas: ["E = I/r² 〔lx〕（法線照度）", "E_h = (I/r²)·cosθ（水平面照度）"],
    learningObjectives: ["点光源の照度を距離の逆二乗則で求められる"],
    hints: ["照度は距離の二乗に反比例", "距離2倍で照度1/4", "光源直下は法線照度"],
    prerequisites: ["逆二乗則"],
    relatedTopics: ["電界と電位", "電熱（必要電力量）"],
    estimatedTimeSec: 90,
    cognitiveLevel: "apply",
  },
  paramSpecs: {
    luminous_intensity: { unit: "cd", realistic_range: [10, 10000] },
    distance_m: { unit: "m", realistic_range: [0.5, 20] },
  },
  generate(rng) {
    const [I, r] = pick(SETS, rng);
    return buildFrom(I, r);
  },
  generateFrom(params) {
    const { luminous_intensity, distance_m } = params;
    if (luminous_intensity === undefined || distance_m === undefined) return null;
    return buildFrom(luminous_intensity, distance_m);
  },
};
