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

  // I-027: easy 連打で ease が単調増加しても interval は有限・正 であることを保証する性質テスト
  it("I-027: easy 連打で ease は単調増加（上限なし）、interval は有限正整数になる", () => {
    let st = sched.init(t0);
    let prevEase = st.ease;
    // 最初の2回は固定間隔（1日、6日）
    st = sched.review(st, "easy", t0);
    st = sched.review(st, "easy", t0);

    // 3〜52回目：ease が下がらず、interval が有限正であることを確認
    for (let i = 0; i < 50; i++) {
      const prev = st.intervalDays;
      st = sched.review(st, "easy", t0);

      // ease は単調非減少（easy の q=5 で ease増加式の値は正になる）
      expect(st.ease, `${i}回目: ease が下がらない`).toBeGreaterThanOrEqual(prevEase - 0.0001);
      prevEase = st.ease;

      // interval は有限正（無限大・NaN にならない）
      expect(Number.isFinite(st.intervalDays), `${i}回目: intervalDays は有限`).toBe(true);
      expect(st.intervalDays, `${i}回目: intervalDays は正`).toBeGreaterThan(0);
      expect(st.intervalDays, `${i}回目: intervalDays は前回以上`).toBeGreaterThanOrEqual(prev);
    }
  });

  it("I-027: dueMs は常に有限（NaN・Infinity にならない）", () => {
    let st = sched.init(t0);
    for (let i = 0; i < 30; i++) {
      st = sched.review(st, "easy", t0);
    }
    // 30回 easy で ease ≈ 3.5 程度、interval は指数的に増大するが有限。
    // dueMs の値は Number.MAX_SAFE_INTEGER を超えることがあるが、NaN・Infinity にはならない。
    // （SM-2 の上限なし ease 設計の意図: Wozniak 1990 に準拠）
    expect(Number.isFinite(st.dueMs)).toBe(true);
    expect(Number.isNaN(st.dueMs)).toBe(false);
  });

  it("I-027: hard 連打でも ease は下限 1.3 で止まり interval は正のまま", () => {
    let st = sched.init(t0);
    st = sched.review(st, "good", t0); // reps=1
    st = sched.review(st, "good", t0); // reps=2
    for (let i = 0; i < 30; i++) {
      st = sched.review(st, "hard", t0);
      expect(st.ease).toBeGreaterThanOrEqual(1.3);
      expect(Number.isFinite(st.intervalDays)).toBe(true);
      expect(st.intervalDays).toBeGreaterThan(0);
    }
  });
});
