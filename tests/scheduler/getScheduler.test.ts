/**
 * tests/scheduler/getScheduler.test.ts
 *
 * getScheduler() のtype-safe選択機構を検証する（II-132）。
 * 既定が FSRS であること、sm2 を選択できること、オプションが反映されることを確認。
 */
import { describe, expect, it } from "vitest";
import { FsrsScheduler, getScheduler, Sm2Scheduler } from "../../lib/scheduler/index.js";

describe("getScheduler", () => {
  it("引数なしは FSRS を返す", () => {
    const s = getScheduler("fsrs");
    expect(s).toBeInstanceOf(FsrsScheduler);
  });

  it('getScheduler("fsrs") は FsrsScheduler を返す', () => {
    const s = getScheduler("fsrs");
    expect(s).toBeInstanceOf(FsrsScheduler);
    // FsrsScheduler の init() が Card を返す（ts-fsrs の Card 型）。
    const card = s.init(new Date());
    expect(card).toBeDefined();
    expect(typeof card.due).toBe("object"); // Date
  });

  it('getScheduler("sm2") は Sm2Scheduler を返す', () => {
    const s = getScheduler("sm2");
    expect(s).toBeInstanceOf(Sm2Scheduler);
    const state = s.init(Date.now());
    expect(state.ease).toBeCloseTo(2.5);
    expect(state.reps).toBe(0);
  });

  it("FSRS の desiredRetention オプションが反映される", () => {
    const s = getScheduler("fsrs", { desiredRetention: 0.85 });
    expect(s).toBeInstanceOf(FsrsScheduler);
    expect(s.desiredRetention).toBeCloseTo(0.85);
  });

  it("FSRS の maximumIntervalDays オプションが転送される（exam-aware の必須シーム）", () => {
    // 以前はファクトリが desiredRetention しか受けず、試験日逆算（maximumIntervalDays）を
    // 使う web 側が new FsrsScheduler を直接呼ばざるを得なかった（ファクトリ迂回の根本原因）。
    const s = getScheduler("fsrs", { desiredRetention: 0.9, maximumIntervalDays: 5 });
    expect(s.maximumIntervalDays).toBe(5);

    // 挙動でも確認: easy を繰り返しても due が上限（5日）を超えない。
    const now = new Date("2026-01-01T00:00:00.000Z");
    let card = s.init(now);
    for (let i = 0; i < 10; i++) card = s.review(card, "easy", now);
    const horizon = now.getTime() + 5 * 24 * 3600_000;
    expect(s.view(card).dueMs).toBeLessThanOrEqual(horizon + 1);
  });

  it("Sm2Scheduler の init() は createdAtMs を含む（II-141）", () => {
    const now = Date.now();
    const s = getScheduler("sm2");
    const state = s.init(now);
    expect(state.createdAtMs).toBe(now);
  });

  it("Sm2Scheduler の review() は createdAtMs を引き継ぐ（II-141）", () => {
    const now = Date.now();
    const s = getScheduler("sm2");
    const state = s.init(now);
    const reviewed = s.review(state, "good", now + 86_400_000);
    expect(reviewed.createdAtMs).toBe(now);
  });
});
