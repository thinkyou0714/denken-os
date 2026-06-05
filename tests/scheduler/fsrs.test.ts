import { describe, expect, it } from "vitest";
import { FsrsScheduler } from "../../lib/scheduler/fsrs.js";

describe("FsrsScheduler", () => {
  const now = new Date("2026-01-01T00:00:00.000Z");

  it("正解で次回復習が未来にスケジュールされる", () => {
    const sched = new FsrsScheduler(0.9);
    const card = sched.init(now);
    const next = sched.review(card, "good", now);
    const view = sched.view(next);
    expect(view.dueMs).toBeGreaterThan(now.getTime());
  });

  it("目標保持率を上げると復習間隔が変わる（高い保持率＝短い間隔）", () => {
    const low = new FsrsScheduler(0.8);
    const high = new FsrsScheduler(0.95);
    const intervalLow = low.view(low.review(low.init(now), "good", now)).scheduledDays;
    const intervalHigh = high.view(high.review(high.init(now), "good", now)).scheduledDays;
    // 保持率を上げるほど「忘れる前に」復習させるので間隔は短く（高々同じ）。
    expect(intervalHigh).toBeLessThanOrEqual(intervalLow);
  });

  it("4段階すべての採点を反映でき、again は good より早い再出題になる", () => {
    const s = new FsrsScheduler(0.9);
    const card = s.init(now);
    for (const r of ["again", "hard", "good", "easy"] as const) {
      const view = s.view(s.review(card, r, now));
      expect(view.dueMs).toBeGreaterThanOrEqual(now.getTime());
    }
    const againDue = s.view(s.review(card, "again", now)).dueMs;
    const goodDue = s.view(s.review(card, "good", now)).dueMs;
    expect(againDue).toBeLessThan(goodDue);
  });

  it("view は reps/lapses/stability を数値で射影する", () => {
    const s = new FsrsScheduler();
    const v = s.view(s.review(s.init(now), "again", now));
    expect(v.reps).toBeGreaterThanOrEqual(1);
    expect(v.lapses).toBeGreaterThanOrEqual(0);
    expect(typeof v.stability).toBe("number");
    expect(typeof v.difficulty).toBe("number");
  });
});
