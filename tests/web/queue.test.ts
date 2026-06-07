/**
 * PEDX-06: 本日の復習キュー集計。
 */
import { describe, expect, it } from "vitest";
import type { ReviewState } from "../../lib/scheduler/types.js";
import { dueSummary } from "../../web/src/queue.js";

const DAY = 86_400_000;
const rs = (dueMs: number): ReviewState => ({ reps: 1, lapses: 0, intervalDays: 1, ease: 2.5, dueMs, lastReviewMs: 0 });

describe("dueSummary", () => {
  const now = Date.UTC(2026, 0, 20);

  it("due 到来・超過・次回を集計する", () => {
    const reviews = new Map<string, ReviewState>([
      ["a", rs(now - 2 * DAY)], // 超過(due かつ overdue)
      ["b", rs(now)], // ちょうど due
      ["c", rs(now + 3 * DAY)], // 未来
    ]);
    const s = dueSummary(reviews, now);
    expect(s.dueNow).toBe(2);
    expect(s.overdue).toBe(1);
    expect(s.nextDueMs).toBe(now + 3 * DAY);
  });

  it("空なら 0/0/null（ノルマ達成相当）", () => {
    expect(dueSummary(new Map(), now)).toEqual({ dueNow: 0, overdue: 0, nextDueMs: null });
  });

  it("全て未来なら dueNow=0 で次回を返す", () => {
    const reviews = new Map([["x", rs(now + 5 * DAY)]]);
    expect(dueSummary(reviews, now)).toEqual({ dueNow: 0, overdue: 0, nextDueMs: now + 5 * DAY });
  });
});
