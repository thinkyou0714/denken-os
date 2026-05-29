import { describe, expect, it } from "vitest";
import { Sm2Scheduler } from "../../lib/scheduler/sm2.js";

describe("Sm2Scheduler", () => {
  const sched = new Sm2Scheduler();
  const t0 = Date.UTC(2026, 0, 1);

  it("正解が続くと復習間隔が延びる", () => {
    let st = sched.init(t0);
    st = sched.review(st, "good", t0); // reps1 → 1日
    expect(st.intervalDays).toBe(1);
    st = sched.review(st, "good", t0); // reps2 → 6日
    expect(st.intervalDays).toBe(6);
    const before = st.intervalDays;
    st = sched.review(st, "good", t0); // reps3 → 6*ease
    expect(st.intervalDays).toBeGreaterThan(before);
  });

  it("不正解で連続正解がリセットされ即再出題（間隔0=優先度上昇）", () => {
    let st = sched.init(t0);
    st = sched.review(st, "good", t0);
    st = sched.review(st, "good", t0);
    st = sched.review(st, "again", t0); // 失敗
    expect(st.reps).toBe(0);
    expect(st.lapses).toBe(1);
    expect(st.intervalDays).toBe(0);
    expect(st.dueMs).toBe(t0); // 当日中に再出題
  });

  it("ease は下限1.3を下回らない", () => {
    let st = sched.init(t0);
    for (let i = 0; i < 10; i++) st = sched.review(st, "again", t0);
    expect(st.ease).toBeGreaterThanOrEqual(1.3);
  });
});
