import { describe, expect, it } from "vitest";
import type { Problem } from "../../lib/engine/schema.js";
import { buildMockExam, isPrimaryPass, PASS_THRESHOLD, scoreExam, scoreExamBySubject } from "../../web/src/exam.js";

function prob(id: string, subject: Problem["subject"]): Problem {
  return {
    id,
    subject,
    topic: `topic-${id}`,
    difficulty: 2,
    statement: "x",
    answer: "1",
    solution: ["1"],
    validation: { solver_checked: true, human_checked: false, clean_answer: true, physically_valid: true },
    source: { type: "original" },
  };
}

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

const pool: Problem[] = [
  ...["a", "b", "c"].map((i) => prob(`理${i}`, "理論")),
  ...["a", "b", "c"].map((i) => prob(`電${i}`, "電力")),
  ...["a", "b"].map((i) => prob(`機${i}`, "機械")),
];

describe("exam（模試）", () => {
  it("buildMockExam: count 件に収め、重複しない", () => {
    const set = buildMockExam(pool, { count: 5, rng: seededRng(1) });
    expect(set.length).toBe(5);
    expect(new Set(set.map((p) => p.id)).size).toBe(5);
  });

  it("buildMockExam: count がプール超なら全件まで", () => {
    const set = buildMockExam(pool, { count: 100, rng: seededRng(2) });
    expect(set.length).toBe(pool.length);
  });

  it("buildMockExam: 科目フィルタを尊重する", () => {
    const set = buildMockExam(pool, { count: 10, subjects: ["理論"], rng: seededRng(3) });
    expect(set.length).toBe(3);
    expect(set.every((p) => p.subject === "理論")).toBe(true);
  });

  it("buildMockExam: 科目をラウンドロビンで均等に混ぜる（先頭3件で3科目）", () => {
    const set = buildMockExam(pool, { count: 3, rng: seededRng(7) });
    expect(new Set(set.map((p) => p.subject)).size).toBe(3);
  });

  it("scoreExam: 正答率と合格判定（60%以上で合格）", () => {
    expect(scoreExam([true, true, true, false, false])).toEqual({
      total: 5,
      correct: 3,
      scorePct: 60,
      passed: true,
    });
    const fail = scoreExam([true, false, false, false]);
    expect(fail.scorePct).toBe(25);
    expect(fail.passed).toBe(false);
    expect(PASS_THRESHOLD).toBe(60);
  });

  it("scoreExam: 空は0%・不合格", () => {
    expect(scoreExam([])).toEqual({ total: 0, correct: 0, scorePct: 0, passed: false });
  });

  it("scoreExamBySubject: 出題順の results を科目で束ねて採点する", () => {
    const set = [prob("a", "理論"), prob("b", "電力"), prob("c", "理論"), prob("d", "電力")];
    const rows = scoreExamBySubject(set, [true, true, false, false]);
    const riron = rows.find((r) => r.subject === "理論")!;
    const denryoku = rows.find((r) => r.subject === "電力")!;
    expect(riron.scorePct).toBe(50); // 1/2
    expect(denryoku.scorePct).toBe(50); // 1/2
  });

  it("isPrimaryPass: 受験した全科目が60%以上なら一次合格", () => {
    const set = [prob("a", "理論"), prob("b", "電力")];
    expect(isPrimaryPass(scoreExamBySubject(set, [true, true]))).toBe(true);
    expect(isPrimaryPass(scoreExamBySubject(set, [true, false]))).toBe(false); // 電力0%で足切り
    expect(isPrimaryPass([])).toBe(false);
  });
});
