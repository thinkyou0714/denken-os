/**
 * テンプレート: 内部抵抗 r の電源から負荷 R に供給できる最大電力。
 *
 * 整合条件 R = r のとき最大で
 *   P_max = E² / (4r)   〔W〕
 *
 * 誤答（成立する典型ミス）:
 *   ① 1/4 を落とす     P' = E²/r
 *   ② 1/2 と取り違え   P' = E²/(2r)
 *   ③ r を二乗         P' = E²/(4r²)
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import type { GenerationResult, Template } from "./types.js";

const EMF: ReadonlyArray<number> = [4, 6, 8, 10, 12, 20, 100];
const R_INT: ReadonlyArray<number> = [1, 2, 4, 5, 10, 25];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildFrom(E: number, r: number): GenerationResult | null {
  if (E <= 0 || r <= 0) return null;
  const Pmax = (E * E) / (4 * r); // 正解
  const noQuarter = (E * E) / r; // ①
  const half = (E * E) / (2 * r); // ②
  const rSquared = (E * E) / (4 * r * r); // ③

  const vals = [Pmax, noQuarter, half, rSquared];
  if (!vals.every((v) => isCleanAnswer(v))) return null;
  const answerText = formatClean(Pmax);
  const texts = new Set(vals.map((v) => formatClean(v)));
  if (texts.size !== 4) return null;

  const choices = [...texts].sort((a, b) => Number(a) - Number(b));
  return {
    params: {
      emf: { value: E, unit: "V", realistic_range: [1, 200] },
      r: { value: r, unit: "ohm", realistic_range: [0.1, 100] },
    },
    answerValue: Pmax,
    answerUnit: "W",
    answerText,
    choices,
    distractors: [
      { text: formatClean(noQuarter), reason: "整合時の係数 1/4 を落とした（R=r で電圧が半分になる）" },
      { text: formatClean(half), reason: "係数を 1/2 と取り違えた" },
      { text: formatClean(rSquared), reason: "分母の内部抵抗を二乗してしまった" },
    ],
    likelyWrongChoice: formatClean(noQuarter),
    facts: { E, r, Pmax },
    defaultStatement:
      `起電力 ${E}V・内部抵抗 ${r}Ω の電源に可変負荷 R を接続する。` + `R を調整して取り出せる最大電力 P_max〔W〕は?`,
    defaultSolution: [
      `最大電力の条件は整合 R = r`,
      `このとき P_max = E²/(4r) = ${E}²/(4×${r})`,
      `P_max = ${answerText} W`,
    ],
    physicallyValid: true,
  };
}

export const maxPowerTransfer: Template = {
  topic: "最大電力供給の定理",
  subject: "理論",
  exam: "denken3",
  difficulty: 3,
  meta: {
    tags: ["理論", "直流回路", "電力", "整合"],
    formulas: ["P_max = E²/(4r)（R=r のとき）"],
    learningObjectives: ["負荷整合の条件と、そのときの最大供給電力を導ける"],
    hints: ["最大電力は負荷=内部抵抗のとき", "そのとき負荷電圧は E/2", "P=V²/R に代入"],
    prerequisites: ["オームの法則", "分圧の法則"],
    relatedTopics: ["テブナンの定理", "分圧の法則"],
    estimatedTimeSec: 150,
  },
  paramSpecs: {
    emf: { unit: "V", realistic_range: [1, 200] },
    r: { unit: "ohm", realistic_range: [0.1, 100] },
  },
  generate(rng) {
    const E = pick(EMF, rng);
    const r = pick(R_INT, rng);
    return buildFrom(E, r);
  },
  generateFrom(params) {
    const { emf, r } = params;
    if (emf === undefined || r === undefined) return null;
    return buildFrom(emf, r);
  },
};
