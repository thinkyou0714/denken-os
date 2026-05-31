/**
 * テンプレート: 点電荷がつくる電界の強さ。
 *
 * 閉形式: E = k·Q/r²   〔V/m〕   （k = 9×10⁹ N·m²/C²、Q は µC）
 *
 * 誤答（成立する典型ミス）:
 *   ① k·Q/r    距離の二乗を忘れ、電位 V=kQ/r を求めてしまった
 *   ② 2·E      係数を 2 倍にした
 *   ③ E/2      係数 1/2 を余計に掛けた
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

const K = 9e9;
// [Q(µC), r(m)]。r=1（E=V）・r=2（V=2E）は誤答が衝突するため除外。
const SETS: ReadonlyArray<readonly [number, number]> = [
  [1, 3],
  [2, 3],
  [3, 3],
  [4, 3],
  [5, 3],
  [6, 3],
  [8, 3],
  [10, 3],
  [2, 6],
  [4, 6],
  [8, 6],
  [10, 6],
  [10, 10],
  [5, 10],
];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(Q_uC: number, r: number): GenerationResult | null {
  if (Q_uC <= 0 || r <= 0) return null;
  const Q = Q_uC * 1e-6;
  const E = (K * Q) / (r * r); // 正解
  const asV = (K * Q) / r; // ① 電位 V と混同
  const dbl = 2 * E; // ②
  const half = E / 2; // ③

  const vals = [E, asV, dbl, half];
  if (!vals.every((v) => isCleanAnswer(v))) return null;
  const answerText = formatClean(E);
  const texts = new Set(vals.map((v) => formatClean(v)));
  if (texts.size !== 4) return null;

  const choices = [...texts].sort((a, b) => Number(a) - Number(b));
  return {
    params: {
      charge_uc: { value: Q_uC, unit: "uC", realistic_range: [0.1, 100] },
      distance_m: { value: r, unit: "m", realistic_range: [0.1, 50] },
    },
    answerValue: E,
    answerUnit: "V/m",
    answerText,
    choices,
    distractors: [
      { text: formatClean(asV), reason: "距離の二乗を忘れ、電位 V=kQ/r を求めてしまった（電界は kQ/r²）" },
      { text: formatClean(dbl), reason: "係数を 2 倍にした" },
      { text: formatClean(half), reason: "係数 1/2 を余計に掛けた" },
    ],
    likelyWrongChoice: formatClean(asV),
    facts: { Q_uC, r, E },
    defaultStatement: `真空中で点電荷 ${Q_uC}µC から ${r}m 離れた点の電界の強さ E〔V/m〕は? （k=9×10⁹ N·m²/C²）`,
    defaultSolution: [`E = k·Q/r²`, `= 9×10⁹ × ${Q_uC}×10⁻⁶ / ${r}²`, `E = ${answerText} V/m`],
    physicallyValid: true,
  };
}

export const electricFieldPotential: Template = {
  topic: "電界と電位",
  subject: "理論",
  exam: "denken3",
  difficulty: 2,
  meta: {
    tags: ["理論", "静電気", "電界", "電位"],
    formulas: ["E = k·Q/r² 〔V/m〕", "V = k·Q/r 〔V〕", "E = V/r（一様電界）"],
    learningObjectives: ["点電荷の電界と電位を区別し、距離依存（r² と r）を使い分けられる"],
    hints: ["電界は r の二乗に反比例", "電位は r に反比例（混同注意）", "µC は 10⁻⁶ C"],
    prerequisites: ["クーロンの法則（静電力）"],
    relatedTopics: ["クーロンの法則（静電力）", "コンデンサの静電エネルギー"],
    estimatedTimeSec: 120,
    cognitiveLevel: "apply",
  },
  paramSpecs: {
    charge_uc: { unit: "uC", realistic_range: [0.1, 100] },
    distance_m: { unit: "m", realistic_range: [0.1, 50] },
  },
  generate(rng) {
    const [Q, r] = pick(SETS, rng);
    return buildFrom(Q, r);
  },
  generateFrom(params) {
    const { charge_uc, distance_m } = params;
    if (charge_uc === undefined || distance_m === undefined) return null;
    return buildFrom(charge_uc, distance_m);
  },
};
