/**
 * テンプレート: ラウス安定判別によるゲイン限界（二種二次・機械制御・descriptive）。
 *   一巡伝達関数 G(s)=K/{s(s+a)(s+b)} の単位フィードバック系の特性方程式は
 *     s³+(a+b)s²+ab·s+K=0
 *   ラウス表の第1列がすべて正となる条件から、安定限界のゲインは
 *     Kmax = ab·(a+b)
 *   過去問頻出の「ラウス・フルビッツの安定判別」を、極配置を振ってひねった改作。
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { defineTemplate, pick } from "./helpers.js";

const A_SET: ReadonlyArray<number> = [1, 2, 3, 4, 5, 10];

type Params = {
  pole_a: number;
  pole_b: number;
};

export const routhStabilityLimit = defineTemplate<Params>({
  topic: "ラウス安定判別によるゲイン限界",
  subject: "機械制御",
  exam: "denken2_secondary",
  difficulty: 5,
  pastExam: { area: "自動制御理論", frequency: "high", years: [2008, 2013, 2019, 2024] },
  paramSpecs: {
    pole_a: { unit: "", realistic_range: [1, 10] },
    pole_b: { unit: "", realistic_range: [1, 10] },
  },
  paramOrder: ["pole_a", "pole_b"],
  draw(rng) {
    return {
      pole_a: pick(A_SET, rng),
      pole_b: pick(A_SET, rng),
    };
  },
  buildFrom({ pole_a: a, pole_b: b }) {
    if (a <= 0 || b <= 0) return null;
    if (a >= b) return null; // 極は相異なる2値（a<b）に正規化して重複 draw を減らす
    const sum = a + b;
    const product = a * b;
    const kMax = product * sum;
    if (kMax <= 0 || !isCleanAnswer(kMax)) return null;
    const answerText = formatClean(kMax);
    return {
      format: "descriptive",
      params: {
        pole_a: { value: a, unit: "", realistic_range: [1, 10] },
        pole_b: { value: b, unit: "", realistic_range: [1, 10] },
      },
      answerValue: kMax,
      answerUnit: "",
      answerText,
      facts: { a, b, sum, product, kMax },
      defaultStatement:
        `一巡伝達関数 G(s)=K/{s(s+${a})(s+${b})} をもつ単位フィードバック制御系がある。` +
        `特性方程式にラウスの安定判別法を適用し、系が安定であるためのゲイン K の上限値を求めよ。`,
      defaultSolution: [
        `着眼点: 特性方程式 1+G(s)=0 を整理し、ラウス表の第1列がすべて正となる条件を課す。`,
        `特性方程式: s³+${sum}s²+${product}s+K=0`,
        `ラウス表第1列: 1, ${sum}, (${sum}×${product}−K)/${sum}, K`,
        `安定条件: K>0 かつ ${sum}×${product}−K>0`,
        `K の上限=${answerText}`,
        `ポイント: 3次系では「中2項の係数の積 > 両端2項の係数の積」が安定条件の要。`,
      ],
      physicallyValid: true,
    };
  },
});
