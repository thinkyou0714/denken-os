/**
 * テンプレート: 変圧器の並行運転（負荷分担）。
 *
 * 構成: 同一容量の変圧器 A, B を並行運転。%インピーダンスが異なる（%Z_A, %Z_B）。
 * 負荷は %Z に反比例して分担される。
 * 閉形式: P_A = L · %Z_B/(%Z_A + %Z_B)   〔kW〕   （%Z が小さい方が多く負担）
 *
 * 誤答（成立する典型ミス）:
 *   ① L·%Z_A/(%Z_A+%Z_B)  %Z 比を逆にした（自分の %Z を分子に置いた）
 *   ② L/2                  %Z に依らず等分とした
 *   ③ L                    片方が全負荷を負担すると誤認
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

// [L(kW), %Z_A, %Z_B]。%Z_A≠%Z_B。P_A, P_B(=swap), L/2, L が綺麗かつ相異なる組。
const SETS: ReadonlyArray<readonly [number, number, number]> = [
  [150, 4, 6],
  [200, 4, 6],
  [100, 4, 6],
  [120, 2, 4],
  [180, 2, 4],
  [250, 2, 3],
  [150, 2, 3],
  [240, 4, 8],
  [300, 4, 6],
  [120, 4, 8],
];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(L: number, zA: number, zB: number): GenerationResult | null {
  if (L <= 0 || zA <= 0 || zB <= 0 || zA === zB) return null;
  const pA = (L * zB) / (zA + zB); // 正解（A の分担。%Z に反比例）
  const swap = (L * zA) / (zA + zB); // ① 比を逆に
  const half = L / 2; // ② 等分
  const all = L; // ③ 全負荷

  const vals = [pA, swap, half, all];
  if (!vals.every((v) => isCleanAnswer(v))) return null;
  const answerText = formatClean(pA);
  const texts = new Set(vals.map((v) => formatClean(v)));
  if (texts.size !== 4) return null;

  const choices = [...texts].sort((a, b) => Number(a) - Number(b));
  return {
    params: {
      load: { value: L, unit: "kW", realistic_range: [10, 5000] },
      percent_z_a: { value: zA, unit: "%", realistic_range: [1, 20] },
      percent_z_b: { value: zB, unit: "%", realistic_range: [1, 20] },
    },
    answerValue: pA,
    answerUnit: "kW",
    answerText,
    choices,
    distractors: [
      { text: formatClean(swap), reason: "%Z 比を逆にした（A の分担は相手 B の %Z に比例＝%Z に反比例）" },
      { text: formatClean(half), reason: "%Z に依らず単純に等分とした" },
      { text: formatClean(all), reason: "片方が全負荷を負担すると誤認した" },
    ],
    likelyWrongChoice: formatClean(swap),
    facts: { L, zA, zB, pA },
    defaultStatement:
      `定格容量の等しい変圧器 A, B を並行運転する。百分率インピーダンスは A が ${zA}%、B が ${zB}% である。` +
      `総負荷 ${L}kW のとき、変圧器 A の分担負荷 P_A〔kW〕は?`,
    defaultSolution: [
      `負荷分担は %Z に反比例: P_A = L·%Z_B/(%Z_A+%Z_B)`,
      `= ${L}×${zB}/(${zA}+${zB})`,
      `P_A = ${answerText} kW`,
    ],
    physicallyValid: true,
  };
}

export const transformerParallel: Template = {
  topic: "変圧器の並行運転",
  subject: "電力",
  exam: "denken3",
  difficulty: 3,
  meta: {
    tags: ["電力", "変圧器", "並行運転", "百分率インピーダンス"],
    formulas: ["P_A = L·%Z_B/(%Z_A+%Z_B)（同容量）", "分担 ∝ 容量/%Z"],
    learningObjectives: ["並行運転で負荷が %Z に反比例して分担されることを理解し計算できる"],
    hints: ["%Z が小さい変圧器ほど多く負担", "自分の分担の分子は『相手』の %Z", "分母は %Z の和"],
    prerequisites: ["パーセントインピーダンスと短絡電流", "変圧器の効率"],
    relatedTopics: ["パーセントインピーダンスと短絡電流", "変圧器の効率"],
    estimatedTimeSec: 150,
    cognitiveLevel: "apply",
  },
  paramSpecs: {
    load: { unit: "kW", realistic_range: [10, 5000] },
    percent_z_a: { unit: "%", realistic_range: [1, 20] },
    percent_z_b: { unit: "%", realistic_range: [1, 20] },
  },
  generate(rng) {
    const [L, zA, zB] = pick(SETS, rng);
    return buildFrom(L, zA, zB);
  },
  generateFrom(params) {
    const { load, percent_z_a, percent_z_b } = params;
    if (load === undefined || percent_z_a === undefined || percent_z_b === undefined) return null;
    return buildFrom(load, percent_z_a, percent_z_b);
  },
};
