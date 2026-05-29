import { describe, expect, it } from "vitest";
import { daysUntil, planExam } from "../../lib/study/exam-plan.js";
import type { PassReadiness } from "../../lib/study/lesson.js";

const DAY = 86_400_000;

function rd(subject: string, accuracy: number, attempts: number): PassReadiness<string> {
  return { subject, accuracy, attempts, onTrack: accuracy >= 0.6, enoughData: attempts >= 5 };
}

describe("daysUntil", () => {
  it("残り日数を切り上げで返す", () => {
    const now = Date.UTC(2026, 0, 1);
    expect(daysUntil(now + 10 * DAY, now)).toBe(10);
    expect(daysUntil(now, now)).toBe(0);
    expect(daysUntil(now - DAY, now)).toBe(-1);
  });
});

describe("planExam — 合格逆算ペース", () => {
  const now = Date.UTC(2026, 0, 1);

  it("試験当日は出し切りメッセージ・目標0", () => {
    const p = planExam({ examMs: now, nowMs: now, readiness: [] });
    expect(p.expired).toBe(true);
    expect(p.todayTarget).toBe(0);
    expect(p.message).toContain("今日が試験日");
  });

  it("試験が過ぎていたら次の目標を促す", () => {
    const p = planExam({ examMs: now - 5 * DAY, nowMs: now, readiness: [] });
    expect(p.expired).toBe(true);
    expect(p.message).toContain("過ぎ");
  });

  it("弱点科目を不足の大きい順に focusOrder へ", () => {
    const p = planExam({
      examMs: now + 30 * DAY,
      nowMs: now,
      readiness: [rd("法規", 0.3, 10), rd("理論", 0.5, 10), rd("機械", 0.9, 10)],
    });
    expect(p.behindSubjects).toEqual(expect.arrayContaining(["法規", "理論"]));
    expect(p.behindSubjects).not.toContain("機械"); // 合格圏は弱点扱いしない
    expect(p.focusOrder[0]).toBe("法規"); // 不足が大きい方が先
  });

  it("データ不足の科目は弱点扱いしない（早合点回避）", () => {
    const p = planExam({
      examMs: now + 30 * DAY,
      nowMs: now,
      readiness: [rd("法規", 0.2, 3)], // attempts<5 → enoughData=false
    });
    expect(p.behindSubjects).toEqual([]);
  });

  it("残り日数が少ないほど今日の目標が増える", () => {
    const readiness = [rd("法規", 0.2, 10), rd("理論", 0.2, 10)];
    const far = planExam({ examMs: now + 60 * DAY, nowMs: now, readiness });
    const near = planExam({ examMs: now + 3 * DAY, nowMs: now, readiness });
    expect(near.todayTarget).toBeGreaterThan(far.todayTarget);
  });

  it("todayTarget は dailyCapacity を超えない", () => {
    const p = planExam({
      examMs: now + 1 * DAY,
      nowMs: now,
      readiness: [rd("法規", 0.0, 10), rd("理論", 0.0, 10), rd("機械", 0.0, 10)],
      dailyCapacity: 8,
    });
    expect(p.todayTarget).toBeLessThanOrEqual(8);
  });

  it("全科目が合格圏なら最低限の維持目標＋範囲拡大メッセージ", () => {
    const p = planExam({
      examMs: now + 30 * DAY,
      nowMs: now,
      readiness: [rd("法規", 0.9, 10), rd("理論", 0.8, 10)],
    });
    expect(p.behindSubjects).toEqual([]);
    expect(p.todayTarget).toBeGreaterThanOrEqual(1); // 習慣維持の地ならし
    expect(p.message).toContain("合格圏");
  });
});
