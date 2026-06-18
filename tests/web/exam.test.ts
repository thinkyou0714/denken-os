import { describe, expect, it } from "vitest";
import type { Problem, Subject } from "../../lib/engine/schema.js";
import {
  buildMockExam,
  buildPrimaryFullMock,
  isPrimaryPass,
  PASS_THRESHOLD,
  PRIMARY_SUBJECTS,
  primaryVerdict,
  SECONDARY_PASS_POINTS,
  scoreExam,
  scoreExamBySubject,
  scoreSecondary,
} from "../../web/src/exam.js";
import { seededRng } from "../helpers/rng.js";

function prob(id: string, subject: Problem["subject"], topic = `topic-${id}`): Problem {
  return {
    id,
    subject,
    topic,
    difficulty: 2,
    statement: "x",
    answer: "1",
    solution: ["1"],
    validation: { solver_checked: true, human_checked: false, clean_answer: true, physically_valid: true },
    source: { type: "original" },
  };
}

const pool: Problem[] = [
  ...["a", "b", "c"].map((i) => prob(`理${i}`, "理論")),
  ...["a", "b", "c"].map((i) => prob(`電${i}`, "電力")),
  ...["a", "b"].map((i) => prob(`機${i}`, "機械")),
];

/** 4科目すべてを含むプール（一次フル模試・合格判定のテスト用）。 */
const primaryPool: Problem[] = [
  ...["a", "b", "c", "d", "e"].map((i) => prob(`理${i}`, "理論")),
  ...["a", "b", "c", "d", "e"].map((i) => prob(`電${i}`, "電力")),
  ...["a", "b", "c", "d", "e"].map((i) => prob(`機${i}`, "機械")),
  ...["a", "b", "c", "d", "e"].map((i) => prob(`法${i}`, "法規")),
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

  it("buildMockExam: 論点の重複を避ける（#59・論点が足りる範囲で）", () => {
    // 同一科目・同一論点が複数ある中で、論点が足りる範囲では重複しない。
    const dup: Problem[] = [
      prob("a1", "理論", "オームの法則"),
      prob("a2", "理論", "オームの法則"),
      prob("b1", "理論", "キルヒホッフ"),
      prob("c1", "電力", "需要率"),
    ];
    const set = buildMockExam(dup, { count: 3, rng: seededRng(11) });
    const topics = set.map((p) => p.topic);
    expect(new Set(topics).size).toBe(topics.length); // 重複なし
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
});

describe("isPrimaryPass / primaryVerdict（一次は4科目すべて必須・#48）", () => {
  it("4科目すべてが60%以上のとき合格", () => {
    const set = PRIMARY_SUBJECTS.map((s, i) => prob(`p${i}`, s));
    expect(isPrimaryPass(scoreExamBySubject(set, [true, true, true, true]))).toBe(true);
    expect(primaryVerdict(scoreExamBySubject(set, [true, true, true, true]))).toBe("pass");
  });

  it("4科目揃っても1科目でも60%未満なら不合格（fail）", () => {
    const set = PRIMARY_SUBJECTS.map((s, i) => prob(`p${i}`, s));
    const rows = scoreExamBySubject(set, [true, true, true, false]); // 法規0%
    expect(isPrimaryPass(rows)).toBe(false);
    expect(primaryVerdict(rows)).toBe("fail");
  });

  it("4科目が揃っていない出題は『部分模試』で合格判定しない（partial）", () => {
    // 理論・電力の2科目だけ → 全問正解でも合格判定にはならない。
    const set = [prob("a", "理論"), prob("b", "電力")];
    const rows = scoreExamBySubject(set, [true, true]);
    expect(isPrimaryPass(rows)).toBe(false);
    expect(primaryVerdict(rows)).toBe("partial");
  });

  it("空は partial（合格ではない）", () => {
    expect(isPrimaryPass([])).toBe(false);
    expect(primaryVerdict([])).toBe("partial");
  });
});

describe("buildPrimaryFullMock（4科目すべてを代表させる・#48）", () => {
  it("4科目すべてを最低1問ずつ含む", () => {
    const set = buildPrimaryFullMock(primaryPool, 8, seededRng(5));
    const subjects = new Set(set.map((p) => p.subject));
    for (const s of PRIMARY_SUBJECTS) expect(subjects.has(s)).toBe(true);
  });

  it("count に収まる（最低件数確保で超過しない）", () => {
    const set = buildPrimaryFullMock(primaryPool, 8, seededRng(6));
    expect(set.length).toBeLessThanOrEqual(8);
    expect(set.length).toBeGreaterThanOrEqual(4); // 4科目ぶん
  });

  it("二次科目は含めない（一次4科目のみ）", () => {
    const mixed = [...primaryPool, prob("d1", "電力管理"), prob("k1", "機械制御")];
    const set = buildPrimaryFullMock(mixed, 12, seededRng(8));
    const allPrimary = set.every((p) => (PRIMARY_SUBJECTS as readonly Subject[]).includes(p.subject));
    expect(allPrimary).toBe(true);
  });

  it("問題に重複がない", () => {
    const set = buildPrimaryFullMock(primaryPool, 16, seededRng(9));
    expect(new Set(set.map((p) => p.id)).size).toBe(set.length);
  });
});

describe("scoreSecondary（二次は合算判定・108/180=60%・#48）", () => {
  // 各科目1問構成: 電力管理1問=120点, 機械制御1問=60点 として換算される。
  const set = [prob("d1", "電力管理"), prob("k1", "機械制御")];

  it("両科目正解なら満点・合格", () => {
    const r = scoreSecondary(set, [true, true]);
    expect(r.totalPoints).toBe(180);
    expect(r.totalMax).toBe(180);
    expect(r.scorePct).toBe(100);
    expect(r.passed).toBe(true);
  });

  it("電力管理のみ正解（120/180=66.7%）は合算で合格", () => {
    const r = scoreSecondary(set, [true, false]);
    expect(r.totalPoints).toBe(120);
    expect(r.scorePct).toBe(67); // round(120/180*100)
    expect(r.passed).toBe(true); // 120 >= 108
  });

  it("機械制御のみ正解（60/180=33%）は合算で不合格", () => {
    const r = scoreSecondary(set, [false, true]);
    expect(r.totalPoints).toBe(60);
    expect(r.passed).toBe(false); // 60 < 108
  });

  it("合格ラインは108点（180×60%）", () => {
    expect(SECONDARY_PASS_POINTS).toBe(108);
  });

  it("科目別ではなく合算で判定する（電力管理0%でも合算60%超なら合格）", () => {
    // 電力管理を2問にして1問正解(60点)、機械制御1問正解(60点) → 合算120/180=合格。
    const set2 = [prob("d1", "電力管理"), prob("d2", "電力管理"), prob("k1", "機械制御")];
    const r = scoreSecondary(set2, [true, false, true]);
    // 電力管理: 1/2*120=60, 機械制御: 1/1*60=60 → 合算120 >= 108
    expect(r.totalPoints).toBe(120);
    expect(r.passed).toBe(true);
  });
});
