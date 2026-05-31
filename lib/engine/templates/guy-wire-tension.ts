/**
 * テンプレート: 支線の張力（電柱の水平張力を支える支線）。
 *
 * 構成: 電柱頂部（高さ h）に水平張力 P。支線は頂部と地上点（水平距離 d）を結ぶ
 *       長さ ℓ=√(h²+d²) の斜材。水平方向のつり合いから支線の水平分力 = P。
 * 閉形式: T = P · ℓ/d   〔N〕   （T の水平成分 T·(d/ℓ)=P）
 *
 * 誤答（成立する典型ミス）:
 *   ① P·d/ℓ   分力比を逆数にした（ℓ/d でなく d/ℓ）
 *   ② P       支線の傾斜（幾何）を無視し、水平張力をそのまま支線張力とした
 *   ③ P·ℓ/h   水平距離 d でなく高さ h で割った
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

// [P(N), h(m), d(m)]。h,d はピタゴラス数で ℓ 整数。T,P·d/ℓ,P,P·ℓ/h が綺麗かつ相異なる組。
const SETS: ReadonlyArray<readonly [number, number, number]> = [
  [1200, 4, 3],
  [2400, 4, 3],
  [3600, 4, 3],
  [600, 3, 4],
  [1200, 3, 4],
  [2400, 8, 6],
  [6000, 4, 3],
  [1800, 3, 4],
];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(P: number, h: number, d: number): GenerationResult | null {
  if (P <= 0 || h <= 0 || d <= 0) return null;
  const ell = Math.sqrt(h * h + d * d);
  if (Math.abs(ell - Math.round(ell)) > 1e-9) return null; // ℓ 整数（ピタゴラス数）のみ
  const L = Math.round(ell);
  const T = (P * L) / d; // 正解
  const inv = (P * d) / L; // ①
  const noGeom = P; // ②
  const useH = (P * L) / h; // ③

  const vals = [T, inv, noGeom, useH];
  if (!vals.every((v) => isCleanAnswer(v))) return null;
  const answerText = formatClean(T);
  const texts = new Set(vals.map((v) => formatClean(v)));
  if (texts.size !== 4) return null;

  const choices = [...texts].sort((a, b) => Number(a) - Number(b));
  return {
    params: {
      horizontal_tension: { value: P, unit: "N", realistic_range: [100, 50000] },
      pole_height: { value: h, unit: "m", realistic_range: [1, 30] },
      horizontal_distance: { value: d, unit: "m", realistic_range: [1, 30] },
    },
    answerValue: T,
    answerUnit: "N",
    answerText,
    choices,
    distractors: [
      { text: formatClean(inv), reason: "分力比を逆数にした（張力は ℓ/d 倍。d/ℓ ではない）" },
      { text: formatClean(noGeom), reason: "支線の傾斜（幾何）を無視し、水平張力をそのまま支線張力とした" },
      { text: formatClean(useH), reason: "水平距離 d でなく高さ h で割った" },
    ],
    likelyWrongChoice: formatClean(inv),
    facts: { P, h, d, ell: L, T },
    defaultStatement:
      `高さ ${h}m の電柱頂部に水平張力 ${P}N が作用する。頂部と地上の点（水平距離 ${d}m）を結ぶ支線で支える。` +
      `支線の長さは √(${h}²+${d}²)=${L}m である。支線の張力 T〔N〕は?`,
    defaultSolution: [
      `支線長 ℓ=√(h²+d²)=${L}m`,
      `水平方向のつり合い T·(d/ℓ)=P より T = P·ℓ/d`,
      `= ${P}×${L}/${d}`,
      `T = ${answerText} N`,
    ],
    physicallyValid: true,
  };
}

export const guyWireTension: Template = {
  topic: "支線の張力",
  subject: "法規",
  exam: "denken3",
  difficulty: 3,
  meta: {
    tags: ["法規", "電技解釈", "支線", "機械的強度"],
    formulas: ["T = P·ℓ/d", "ℓ=√(h²+d²)", "水平分力 T·d/ℓ = P"],
    learningObjectives: ["幾何と力のつり合いから支線張力を求められる"],
    hints: ["支線長 ℓ は三平方の定理", "水平分力で電線張力を支える", "T = P × (斜辺/水平距離)"],
    prerequisites: ["風圧荷重", "三平方の定理"],
    relatedTopics: ["風圧荷重", "架空電線のたるみ（弛度）"],
    estimatedTimeSec: 180,
    cognitiveLevel: "apply",
    references: [{ label: "電気設備技術基準の解釈 第61条", article: "支線の施設" }],
  },
  paramSpecs: {
    horizontal_tension: { unit: "N", realistic_range: [100, 50000] },
    pole_height: { unit: "m", realistic_range: [1, 30] },
    horizontal_distance: { unit: "m", realistic_range: [1, 30] },
  },
  generate(rng) {
    const [P, h, d] = pick(SETS, rng);
    return buildFrom(P, h, d);
  },
  generateFrom(params) {
    const { horizontal_tension, pole_height, horizontal_distance } = params;
    if (horizontal_tension === undefined || pole_height === undefined || horizontal_distance === undefined) return null;
    return buildFrom(horizontal_tension, pole_height, horizontal_distance);
  },
};
