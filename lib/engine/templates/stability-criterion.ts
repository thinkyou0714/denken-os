/**
 * テンプレート: 自動制御系の安定判別（3次系のラウス＝フルビッツ条件, 電験二種二次「機械・制御」）。
 *
 * 特性方程式 s³ + a·s² + b·s + c = 0 の安定条件:
 *   全係数が正、かつ a·b > c。（a·b=c は安定限界、a·b<c は不安定）
 *
 * 選択式。正しい結論を選ばせ、誤答は別ケースの結論。
 */
import type { GenerationResult, Template } from "./types.js";

const S_OK = "安定（全係数が正、かつ a·b > c を満たす）";
const S_ABC = "不安定（a·b < c によりラウス表第1列に符号変化が生じる）";
const S_NEG = "不安定（係数に負または零があり、安定の必要条件を満たさない）";
const S_LIM = "安定限界（a·b = c で、s 平面の虚軸上に極をもつ）";
const CHOICES = [S_OK, S_ABC, S_NEG, S_LIM];

// [a, b, c]。安定/ab<c/安定限界 を網羅。
const SETS: ReadonlyArray<readonly [number, number, number]> = [
  [2, 3, 1],
  [3, 4, 2],
  [4, 5, 3],
  [5, 6, 2],
  [2, 5, 3],
  [1, 1, 5],
  [1, 2, 5],
  [2, 2, 5],
  [2, 2, 4],
  [3, 3, 9],
];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function classify(a: number, b: number, c: number): string {
  if (a <= 0 || b <= 0 || c <= 0) return S_NEG;
  const ab = a * b;
  if (ab > c) return S_OK;
  if (ab < c) return S_ABC;
  return S_LIM;
}

function buildFrom(a: number, b: number, c: number): GenerationResult | null {
  if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(c)) return null;
  const answer = classify(a, b, c);
  const distractors = CHOICES.filter((ch) => ch !== answer).map((ch) => {
    let reason: string;
    if (ch === S_OK) reason = "a·b>c かつ全係数正のときの結論。この係数では成り立たない";
    else if (ch === S_ABC) reason = "a·b<c のときの結論。この係数には当てはまらない";
    else if (ch === S_NEG) reason = "係数に負・零があるときの結論。本問は全係数正";
    else reason = "a·b=c（安定限界）のときの結論。本問は等号が成り立たない";
    return { text: ch, reason };
  });

  return {
    format: "multiple_choice",
    params: {
      a: { value: a, unit: "", realistic_range: [0.1, 20] },
      b: { value: b, unit: "", realistic_range: [0.1, 20] },
      c: { value: c, unit: "", realistic_range: [0.1, 20] },
    },
    answerValue: a * b - c,
    answerUnit: "",
    answerText: answer,
    choices: CHOICES,
    distractors,
    likelyWrongChoice: distractors[0]!.text,
    facts: { a, b, c, ab: a * b },
    defaultStatement:
      `特性方程式 s³ + ${a}s² + ${b}s + ${c} = 0 で表される制御系の安定性を、` +
      `ラウス＝フルビッツの安定判別により評価せよ。`,
    defaultSolution: [
      `3次系の安定条件: 全係数が正、かつ a·b > c`,
      `a·b = ${a}×${b} = ${a * b}、c = ${c}`,
      `${a * b > c ? "a·b>c" : a * b < c ? "a·b<c" : "a·b=c"} であるから、判定結果は次のとおり`,
      answer,
    ],
    physicallyValid: true,
  };
}

export const stabilityCriterion: Template = {
  topic: "自動制御の安定判別",
  subject: "機械制御",
  exam: "denken2_secondary",
  difficulty: 4,
  meta: {
    tags: ["機械制御", "二次試験", "自動制御", "安定判別", "ラウス"],
    formulas: ["3次 s³+as²+bs+c: 安定 ⇔ a,b,c>0 かつ ab>c", "ラウス表第1列の符号"],
    learningObjectives: ["3次系の特性方程式からラウス＝フルビッツ条件で安定性を判別できる"],
    hints: ["まず全係数の符号（必要条件）", "3次は ab>c が決め手", "ab=c は安定限界（持続振動）"],
    prerequisites: ["自動制御（伝達関数・ブロック線図）"],
    relatedTopics: ["自動制御（伝達関数・ブロック線図）", "状態方程式"],
    estimatedTimeSec: 420,
    cognitiveLevel: "analyze",
    references: [{ label: "ラウス・フルビッツの安定判別", article: "機械・制御（二次）頻出テーマ" }],
  },
  paramSpecs: {
    a: { unit: "", realistic_range: [0.1, 20] },
    b: { unit: "", realistic_range: [0.1, 20] },
    c: { unit: "", realistic_range: [0.1, 20] },
  },
  generate(rng) {
    const [a, b, c] = pick(SETS, rng);
    return buildFrom(a, b, c);
  },
  generateFrom(params) {
    const { a, b, c } = params;
    if (a === undefined || b === undefined || c === undefined) return null;
    return buildFrom(a, b, c);
  },
};
