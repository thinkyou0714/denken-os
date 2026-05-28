import { describe, it, expect } from "vitest";
import { problems } from "@/data/problems";
import { ProblemListSchema, SUBJECTS, isSubject } from "@/domain/content/schema";

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

  it("isSubject は有効な科目のみ true", () => {
    expect(isSubject("theory")).toBe(true);
    expect(isSubject("law")).toBe(true);
    expect(isSubject("unknown")).toBe(false);
    expect(isSubject(null)).toBe(false);
    expect(isSubject(undefined)).toBe(false);
  });

  it("各科目に最低 5 問のコンテンツが存在する", () => {
    for (const s of SUBJECTS) {
      const count = problems.filter((p) => p.subject === s).length;
      expect(count, `subject=${s}`).toBeGreaterThanOrEqual(5);
    }
  });

  it("source 付きの問題が存在する(過去問/オリジナル区別の運用確認)", () => {
    const withSource = problems.filter((p) => p.source !== undefined);
    expect(withSource.length).toBeGreaterThan(0);
  });

  it("図(figureSvg)付きの問題が複数存在する(回路/ベクトル/結線図)", () => {
    const withFigure = problems.filter((p) => p.figureSvg !== undefined);
    expect(withFigure.length).toBeGreaterThanOrEqual(3);
    // 全 SVG は <svg で始まることを確認(壊れた markup を防ぐ)
    for (const p of withFigure) {
      expect(p.figureSvg!.trim().startsWith("<svg")).toBe(true);
    }
  });
});
