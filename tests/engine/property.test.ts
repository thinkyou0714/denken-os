/**
 * エンジン不変条件の property-based シード探索（fast-check）。
 * template-invariants.test.ts は固定シード(12345)の sweep。ここは乱数シードを広く振り、
 * 「どの draw でも generate は null か有限・範囲内・answer∈choices で、generateFrom と一致する」
 * 性質を保証する（固定1シードが見逃す係数組合せ＝決定論の単一式性を掘る）。
 */
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { getTemplate, listTopics } from "../../lib/engine/templates/index.js";

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

const hasNonFinite = (s: string) => /NaN|Infinity/.test(s);

describe("エンジン不変条件（property-based シード探索）", () => {
  for (const topic of listTopics()) {
    const t = getTemplate(topic)!;
    it(`${topic}: 乱数シードを振っても不変条件が崩れず generateFrom と一致`, () => {
      fc.assert(
        fc.property(fc.integer(), (seed) => {
          const r = t.generate(seededRng(seed));
          if (r === null) return; // 振り直しは許容
          expect(t.difficulty).toBeGreaterThanOrEqual(1);
          expect(t.difficulty).toBeLessThanOrEqual(5);
          expect(Number.isFinite(r.answerValue)).toBe(true);
          expect(hasNonFinite(JSON.stringify(r))).toBe(false);
          if ((r.format ?? "multiple_choice") === "multiple_choice") {
            expect(r.choices?.includes(r.answerText)).toBe(true);
          }
          for (const p of Object.values(r.params)) {
            if (p.realistic_range) {
              expect(p.value).toBeGreaterThanOrEqual(p.realistic_range[0]);
              expect(p.value).toBeLessThanOrEqual(p.realistic_range[1]);
            }
          }
          // 決定論: 同じ params → 同じ答案（ハルシネーション対策の単一式性）。
          const params = Object.fromEntries(Object.entries(r.params).map(([k, v]) => [k, v.value]));
          const again = t.generateFrom(params);
          expect(again?.answerText).toBe(r.answerText);
          expect(again?.answerValue).toBe(r.answerValue);
        }),
        { numRuns: 120 },
      );
    });
  }
});
