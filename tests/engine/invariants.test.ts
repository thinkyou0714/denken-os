/**
 * 全テンプレートの不変条件スイープ（根本品質）。
 *
 * 例示ベースのテストは「たまたま通る種」を見逃す。ここでは各テンプレを多数シードで
 * 回し、生成されたあらゆる問題が満たすべき不変条件を網羅的に検証する:
 *   - スキーマ＋コード側検証(validateProblem)を通る
 *   - multiple_choice は answer∈choices・選択肢が一意・2件以上
 *   - numeric/descriptive は choices を持たない
 *   - difficulty が 1..5・exam↔subject が制度上成立
 *   - generate と generateFrom(params) が一致（決定論・式の単一性）
 * これにより「正解の正しさ」を担保する設計が、係数のあらゆる組合せで崩れないことを守る。
 */
import { describe, expect, it } from "vitest";
import { generate } from "../../lib/engine/generate.js";
import { StubNarrator } from "../../lib/engine/narrate.js";
import { isExamSubjectValid } from "../../lib/engine/schema.js";
import { getTemplate, listTopics } from "../../lib/engine/templates/index.js";
import { validateProblem } from "../../lib/engine/validate.js";

function seededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SWEEP = 60; // テンプレあたりの生成数

describe("全テンプレ不変条件スイープ", () => {
  for (const topic of listTopics()) {
    const template = getTemplate(topic)!;

    it(`${topic}: ${SWEEP}問すべてが不変条件を満たす`, async () => {
      const problems = await generate(template, {
        count: SWEEP,
        narrator: new StubNarrator(),
        rng: seededRng(0xc0ffee),
      });
      expect(problems.length).toBe(SWEEP);

      for (const p of problems) {
        // 構造＋コード側不変条件。
        expect(validateProblem(p).ok, `${p.id}: validate 失敗`).toBe(true);
        // 難易度と制度整合。
        expect(p.difficulty).toBeGreaterThanOrEqual(1);
        expect(p.difficulty).toBeLessThanOrEqual(5);
        expect(isExamSubjectValid(p.exam, p.subject)).toBe(true);

        if (p.format === "multiple_choice") {
          expect(p.choices, `${p.id}: MC に choices 無し`).toBeDefined();
          const choices = p.choices!;
          expect(choices.length).toBeGreaterThanOrEqual(2);
          expect(new Set(choices).size, `${p.id}: 選択肢が重複`).toBe(choices.length);
          expect(choices, `${p.id}: answer∉choices`).toContain(p.answer);
        } else {
          expect(p.choices, `${p.id}: 非MCに choices`).toBeUndefined();
        }

        // 決定論: 同じ params から generateFrom で同じ答え・選択肢になる（式の単一性）。
        const numericParams = Object.fromEntries(Object.entries(p.params ?? {}).map(([k, v]) => [k, v.value]));
        const round = template.generateFrom(numericParams);
        expect(round, `${p.id}: generateFrom が null`).not.toBeNull();
        expect(round!.answerText, `${p.id}: generate と generateFrom の答えが不一致`).toBe(p.answer);
        if (p.format === "multiple_choice") {
          expect(round!.choices).toEqual(p.choices);
        }
      }
    });
  }
});
