import { describe, it, expect } from "vitest";
import { calibrationStats } from "@/domain/gamification/calibration";
import type { ReviewRecord } from "@/domain/progress/store";

function r(
  confidence: 0 | 1 | 2 | undefined,
  correct: boolean,
): ReviewRecord {
  return {
    problemId: "x",
    grade: correct ? "good" : "again",
    correct,
    reviewedAt: "2026-05-28T00:00:00Z",
    ...(confidence !== undefined && { confidence }),
  };
}

describe("calibrationStats", () => {
  it("confidence 未記録の log は除外する", () => {
    const s = calibrationStats([r(undefined, true), r(undefined, false)]);
    expect(s.total).toBe(0);
    expect(s.score).toBe(0);
  });

  it("自信=高で誤答は過信、自信=低で正答は謙虚に分類", () => {
    const s = calibrationStats([
      r(2, false), // 過信
      r(0, true), // 謙虚
      r(1, true), // 校正済(中立)
      r(2, true), // 校正済
      r(0, false), // 校正済
    ]);
    expect(s.total).toBe(5);
    expect(s.overconfident).toBe(1);
    expect(s.underconfident).toBe(1);
    expect(s.calibrated).toBe(3);
    expect(s.score).toBe(60);
  });

  it("全件が校正済なら 100 点", () => {
    const s = calibrationStats([
      r(2, true),
      r(1, true),
      r(0, false),
      r(1, false),
    ]);
    expect(s.score).toBe(100);
  });
});
