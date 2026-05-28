import { describe, it, expect } from "vitest";
import {
  computeStreak,
  weeklyActiveDays,
  dayKey,
} from "@/domain/gamification/streak";
import type { ReviewRecord } from "@/domain/progress/store";

function review(date: string): ReviewRecord {
  return {
    problemId: "x",
    grade: "good",
    correct: true,
    reviewedAt: date + "T12:00:00Z",
  };
}

const TODAY = new Date(2026, 4, 28); // 2026-05-28 (local)

describe("computeStreak", () => {
  it("ログが無いとき current=0 longest=0", () => {
    const r = computeStreak([], TODAY, 0);
    expect(r.current).toBe(0);
    expect(r.longest).toBe(0);
    expect(r.activeToday).toBe(false);
  });

  it("今日だけ学習で 1 連続", () => {
    const r = computeStreak([review(dayKey(TODAY))], TODAY, 0);
    expect(r.current).toBe(1);
    expect(r.activeToday).toBe(true);
  });

  it("3 日連続で current=3 longest=3", () => {
    const logs = [
      review("2026-05-26"),
      review("2026-05-27"),
      review("2026-05-28"),
    ];
    const r = computeStreak(logs, TODAY, 0);
    expect(r.current).toBe(3);
    expect(r.longest).toBe(3);
  });

  it("今日が未活動でも昨日まで連続なら grace で current=2", () => {
    const logs = [review("2026-05-26"), review("2026-05-27")];
    const r = computeStreak(logs, TODAY, 0);
    expect(r.current).toBe(2);
    expect(r.activeToday).toBe(false);
  });

  it("フリーズが途中のギャップを 1 日埋める", () => {
    // 5/24 active, 5/25 gap, 5/26 active, 5/27 active, today=5/28 grace
    const logs = [
      review("2026-05-24"),
      review("2026-05-26"),
      review("2026-05-27"),
    ];
    const r = computeStreak(logs, TODAY, 1);
    expect(r.current).toBe(3);
    expect(r.freezesUsed).toBe(1);
  });

  it("フリーズ不足のギャップで連続が止まる", () => {
    const logs = [
      review("2026-05-24"),
      review("2026-05-26"),
      review("2026-05-27"),
    ];
    const r = computeStreak(logs, TODAY, 0);
    expect(r.current).toBe(2); // 5/26, 5/27 のみ
  });

  it("longest は素の最長で算出(フリーズ非適用)", () => {
    const logs = [
      review("2026-05-01"),
      review("2026-05-02"),
      review("2026-05-03"),
      review("2026-05-04"),
      review("2026-05-05"),
      // ギャップ
      review("2026-05-10"),
    ];
    expect(computeStreak(logs, TODAY, 10).longest).toBe(5);
  });

  it("daysSinceLast は最後の活動からの日数", () => {
    const logs = [review("2026-05-25")];
    expect(computeStreak(logs, TODAY, 0).daysSinceLast).toBe(3);
  });
});

describe("weeklyActiveDays", () => {
  it("今週と先週の活動日数を返す", () => {
    // 2026-05-28 は木曜。今週月曜=5/25。
    const logs = [
      review("2026-05-25"), // 今週月
      review("2026-05-26"), // 今週火
      review("2026-05-28"), // 今週木
      review("2026-05-20"), // 先週水
      review("2026-05-22"), // 先週金
    ];
    const r = weeklyActiveDays(logs, TODAY);
    expect(r.thisWeek).toBe(3);
    expect(r.lastWeek).toBe(2);
  });
});
