import { describe, it, expect } from "vitest";
import { problems } from "@/data/problems";
import { ProblemListSchema, SUBJECTS } from "@/domain/content/schema";

describe("シードコンテンツ", () => {
  it("全問題が Zod スキーマに適合する", () => {
    expect(() => ProblemListSchema.parse(problems)).not.toThrow();
  });

  it("id が一意である", () => {
    const ids = problems.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("answerIndex が choices の範囲内", () => {
    for (const p of problems) {
      expect(p.answerIndex).toBeGreaterThanOrEqual(0);
      expect(p.answerIndex).toBeLessThan(p.choices.length);
    }
  });

  it("4 科目すべてに問題が存在する", () => {
    for (const s of SUBJECTS) {
      expect(problems.some((p) => p.subject === s)).toBe(true);
    }
  });
});
