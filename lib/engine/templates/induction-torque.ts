/**
 * テンプレート: 誘導電動機のトルク（電圧の二乗に比例）。
 *
 * 関係: すべり一定なら T ∝ V²。電圧が定格の k 倍のとき T は k² 倍。
 * 閉形式: T_ratio = k² × 100   〔定格トルクに対する %〕
 *
 * 誤答（成立する典型ミス）— 指数（次数）の取り違え:
 *   ① k×100      電圧に比例(1乗)と誤認した
 *   ② k³×100     3乗と誤認した
 *   ③ √k×100     平方根(1/2乗)と誤認した
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

const round2 = (x: number) => Math.round(x * 100) / 100;
// 電圧比 k（定格に対する倍率）。
const RATIOS: ReadonlyArray<number> = [0.5, 0.6, 0.7, 0.8, 0.9, 1.1, 1.2];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(k: number): GenerationResult | null {
  if (k <= 0 || k === 1) return null;
  const sq = round2(k * k * 100); // 正解
  const lin = round2(k * 100); // ①
  const cube = round2(k * k * k * 100); // ②
  const sqrt = round2(Math.sqrt(k) * 100); // ③

  const vals = [sq, lin, cube, sqrt];
  if (!vals.every((v) => isCleanAnswer(v) && v > 0)) return null;
  const answerText = formatClean(sq);
  const texts = new Set(vals.map((v) => formatClean(v)));
  if (texts.size !== 4) return null;

  const choices = [...texts].sort((a, b) => Number(a) - Number(b));
  const pctK = round2(k * 100);
  return {
    params: {
      voltage_ratio: { value: k, unit: "", realistic_range: [0.4, 1.3] },
    },
    answerValue: sq,
    answerUnit: "%",
    answerText,
    choices,
    distractors: [
      { text: formatClean(lin), reason: "トルクは電圧に比例(1乗)と誤認した（実際は V² に比例）" },
      { text: formatClean(cube), reason: "電圧比を 3 乗した（正しくは 2 乗）" },
      { text: formatClean(sqrt), reason: "電圧比の平方根(1/2乗)をとった（正しくは 2 乗）" },
    ],
    likelyWrongChoice: formatClean(lin),
    facts: { k, sq },
    defaultStatement:
      `三相誘導電動機を、すべりを一定に保ったまま定格電圧の ${pctK}% で運転する。` +
      `このときの発生トルクは定格トルクの何〔%〕か?`,
    defaultSolution: [`誘導電動機のトルクは電圧の二乗に比例 T ∝ V²`, `T_ratio = (${k})² × 100`, `T = ${answerText} %`],
    physicallyValid: true,
  };
}

export const inductionTorque: Template = {
  topic: "誘導電動機のトルク",
  subject: "機械",
  exam: "denken3",
  difficulty: 2,
  meta: {
    tags: ["機械", "誘導機", "誘導電動機", "トルク"],
    formulas: ["T ∝ V²（すべり一定）", "T = (3/ω_s)·(V²·r₂/s)/((r₁+r₂/s)²+x²)"],
    learningObjectives: ["誘導電動機のトルクが電圧の二乗に比例することを理解し電圧変化の影響を求められる"],
    hints: ["トルクは電圧の『二乗』に比例", "電圧 80% → トルク 0.8²=64%", "電圧低下の影響は大きい"],
    prerequisites: ["誘導電動機の回転速度"],
    relatedTopics: ["誘導電動機の回転速度", "誘導電動機の二次入力比例配分"],
    estimatedTimeSec: 90,
    cognitiveLevel: "understand",
  },
  paramSpecs: {
    voltage_ratio: { unit: "", realistic_range: [0.4, 1.3] },
  },
  generate(rng) {
    return buildFrom(pick(RATIOS, rng));
  },
  generateFrom(params) {
    const { voltage_ratio } = params;
    if (voltage_ratio === undefined) return null;
    return buildFrom(voltage_ratio);
  },
};
