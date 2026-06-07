/**
 * SCHED-1: FsrsReviewScheduler が Scheduler(ReviewState in/out) として機能し、
 * FSRS の stability/difficulty が永続化往復(B3)を越えて保持され、
 * 再構成した Card から同じ次回スケジュールが再現されることを検証する。
 */
import { describe, expect, it } from "vitest";
import { cardToReviewState, FsrsReviewScheduler, reviewStateToCard } from "../../lib/scheduler/fsrs.js";
import type { Scheduler } from "../../lib/scheduler/types.js";
import { reviewStateToRow, rowToReviewState } from "../../lib/store/supabase-store.js";

const NOW = Date.UTC(2026, 0, 1);
const LATER = Date.UTC(2026, 0, 5);

describe("FsrsReviewScheduler（FSRS を Scheduler として永続化経路に乗せる）", () => {
  it("Scheduler インターフェースに適合する", () => {
    const s: Scheduler = new FsrsReviewScheduler(0.9); // 代入できる = 型適合
    expect(typeof s.init).toBe("function");
    expect(typeof s.review).toBe("function");
  });

  it("review 後の ReviewState は stability/difficulty を持つ", () => {
    const sched = new FsrsReviewScheduler(0.9);
    const s1 = sched.review(sched.init(NOW), "good", NOW);
    expect(s1.stability).toBeGreaterThan(0);
    expect(s1.difficulty).toBeGreaterThan(0);
    expect(s1.dueMs).toBeGreaterThan(NOW);
  });

  it("store 往復で FSRS フィールドが保たれ、続きから同じ次回予定を再現する", () => {
    const sched = new FsrsReviewScheduler(0.9);
    const s1 = sched.review(sched.init(NOW), "good", NOW);

    // B3 の行ストア往復で stability/difficulty が失われない。
    const reloaded = rowToReviewState(reviewStateToRow("u1", "三相交流電力", s1));
    expect(reloaded.stability).toBeCloseTo(s1.stability!, 6);
    expect(reloaded.difficulty).toBeCloseTo(s1.difficulty!, 6);

    // 再構成した状態から続けても、元の状態から続けたのと同じ次回スケジュールになる。
    const fromOriginal = sched.review(s1, "good", LATER);
    const fromReloaded = sched.review(reloaded, "good", LATER);
    expect(fromReloaded.dueMs).toBe(fromOriginal.dueMs);
    expect(fromReloaded.stability).toBeCloseTo(fromOriginal.stability!, 6);
  });

  it("cardToReviewState ⇔ reviewStateToCard は stability/difficulty/due を往復保持する", () => {
    const fsrsSched = new FsrsReviewScheduler(0.9);
    const rs = fsrsSched.review(fsrsSched.init(NOW), "easy", NOW);
    const back = cardToReviewState(reviewStateToCard(rs));
    expect(back.stability).toBeCloseTo(rs.stability!, 6);
    expect(back.difficulty).toBeCloseTo(rs.difficulty!, 6);
    expect(back.dueMs).toBe(rs.dueMs);
  });
});
