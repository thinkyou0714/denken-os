/**
 * tests/web/perf-cache.test.ts — キャッシュ結果が非キャッシュ時と完全一致することを検証（II-143〜II-147）。
 *
 * RG5 の受け入れ基準: メモ化は純粋性を壊さない。
 * 各キャッシュ関数の結果が、対応するオリジナル関数の結果と deep equal であることを確認する。
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  type AchievementInput,
  clearBadgeCache,
  evaluateAchievements,
  evaluateAchievementsCached,
} from "../../web/src/achievements.js";
import { byTopic, byTopicCached, clearByTopicCache } from "../../web/src/dashboard.js";
import {
  clearTipIndexCache,
  type MascotContext,
  type MascotMood,
  mascotHome,
  mascotTip,
  tipIndexForDay,
} from "../../web/src/mascot.js";
import type { WebAnswerLog } from "../../web/src/store.js";
import { clearXpByDayCache, xpByDay, xpByDayCached } from "../../web/src/xp.js";

const JST = 9 * 3600_000;
const DAY0 = Date.UTC(2026, 0, 5, 3, 0, 0); // 2026-01-05 12:00 JST

function log(over: Partial<WebAnswerLog> = {}): WebAnswerLog {
  return { topic: "三相交流電力", correct: true, atMs: DAY0, rating: "good", ...over };
}

function makeLogs(n: number): WebAnswerLog[] {
  return Array.from({ length: n }, (_, i) =>
    log({ atMs: DAY0 + i * 3600_000, topic: i % 3 === 0 ? "回路計算" : i % 3 === 1 ? "変圧器" : "三相交流電力" }),
  );
}

// ---- II-143: xpByDay メモ化 ----
describe("xpByDayCached（II-143）", () => {
  beforeEach(() => clearXpByDayCache());

  it("結果が非キャッシュ時と完全一致する", () => {
    const logs = makeLogs(30);
    const nowMs = DAY0 + 2 * 3600_000;
    const expected = xpByDay(logs, 7, nowMs, JST);
    const cached = xpByDayCached(logs, 7, nowMs, JST);
    expect(cached).toEqual(expected);
  });

  it("同じ入力で2回目はキャッシュを返す（参照一致）", () => {
    const logs = makeLogs(10);
    const nowMs = DAY0;
    const r1 = xpByDayCached(logs, 7, nowMs, JST);
    const r2 = xpByDayCached(logs, 7, nowMs, JST);
    expect(r1).toBe(r2); // 同一参照
  });

  it("ログが増えると再計算し、結果が非キャッシュと一致する", () => {
    const logs1 = makeLogs(5);
    const nowMs = DAY0 + 3600_000;
    xpByDayCached(logs1, 7, nowMs, JST); // キャッシュに乗せる
    const logs2 = [...logs1, log({ atMs: DAY0 + 10 * 3600_000, topic: "変圧器" })];
    const expected = xpByDay(logs2, 7, nowMs, JST);
    const cached = xpByDayCached(logs2, 7, nowMs, JST);
    expect(cached).toEqual(expected);
  });

  it("days が変わると再計算する", () => {
    const logs = makeLogs(20);
    const nowMs = DAY0;
    const r7 = xpByDayCached(logs, 7, nowMs, JST);
    const r14 = xpByDayCached(logs, 14, nowMs, JST);
    expect(r7.length).toBe(7);
    expect(r14.length).toBe(14);
    // 値も非キャッシュと一致
    expect(r7).toEqual(xpByDay(logs, 7, nowMs, JST));
    expect(r14).toEqual(xpByDay(logs, 14, nowMs, JST));
  });

  it("ログが空のとき非キャッシュと同じ結果を返す", () => {
    const nowMs = DAY0;
    expect(xpByDayCached([], 7, nowMs, JST)).toEqual(xpByDay([], 7, nowMs, JST));
  });
});

// ---- II-144: byTopic メモ化 ----
describe("byTopicCached（II-144）", () => {
  beforeEach(() => clearByTopicCache());

  it("結果が非キャッシュ時と deep equal", () => {
    const logs = makeLogs(20);
    expect(byTopicCached(logs)).toEqual(byTopic(logs));
  });

  it("同じ入力で2回目はキャッシュを返す（参照一致）", () => {
    const logs = makeLogs(10);
    const r1 = byTopicCached(logs);
    const r2 = byTopicCached(logs);
    expect(r1).toBe(r2);
  });

  it("ログが増えると再計算し結果一致", () => {
    const logs1 = makeLogs(5);
    byTopicCached(logs1);
    const logs2 = [...logs1, log({ atMs: DAY0 + 1000, topic: "送配電" })];
    expect(byTopicCached(logs2)).toEqual(byTopic(logs2));
  });

  it("空ログは空配列を返す", () => {
    expect(byTopicCached([])).toEqual([]);
  });
});

// ---- II-145: バッジステータスキャッシュ ----
describe("evaluateAchievementsCached（II-145）", () => {
  beforeEach(() => clearBadgeCache());

  function makeInput(logs: WebAnswerLog[]): AchievementInput {
    return { logs, streakDays: 3, level: 5, nowMs: DAY0 };
  }

  it("結果が非キャッシュ時と deep equal", () => {
    const logs = makeLogs(10);
    const input = makeInput(logs);
    expect(evaluateAchievementsCached(input)).toEqual(evaluateAchievements(input));
  });

  it("同じ入力で2回目はキャッシュを返す（参照一致）", () => {
    const logs = makeLogs(5);
    const input = makeInput(logs);
    const r1 = evaluateAchievementsCached(input);
    const r2 = evaluateAchievementsCached(input);
    expect(r1).toBe(r2);
  });

  it("ログが増えると再計算し結果一致", () => {
    const logs1 = makeLogs(3);
    evaluateAchievementsCached(makeInput(logs1));
    const logs2 = makeLogs(15);
    const input2 = makeInput(logs2);
    expect(evaluateAchievementsCached(input2)).toEqual(evaluateAchievements(input2));
  });

  it("streakDays が変わると再計算する", () => {
    const logs = makeLogs(5);
    const input1 = { ...makeInput(logs), streakDays: 5 };
    const input2 = { ...makeInput(logs), streakDays: 30 };
    const r1 = evaluateAchievementsCached(input1);
    const r2 = evaluateAchievementsCached(input2);
    // streak30 バッジの解除状態が異なる
    const badge30_1 = r1.find((v) => v.id === "streak30");
    const badge30_2 = r2.find((v) => v.id === "streak30");
    expect(badge30_1?.unlocked).toBe(false);
    expect(badge30_2?.unlocked).toBe(true);
  });
});

// ---- II-146: mascotHome ルックアップ表 ----
describe("mascotHome（II-146 ルックアップ表）", () => {
  const baseCtx: MascotContext = {
    streakState: "active",
    streakDays: 5,
    todayCount: 0,
    dailyGoal: 5,
    dueCount: 0,
    dayIndex: 0,
  };

  it("none → happy + 初回メッセージ", () => {
    const r = mascotHome({ ...baseCtx, streakState: "none" });
    expect(r.mood).toBe("happy");
    expect(r.message).toContain("はじめまして");
  });

  it("broken → sad", () => {
    expect(mascotHome({ ...baseCtx, streakState: "broken" }).mood).toBe("sad");
  });

  it("at-risk → worried", () => {
    expect(mascotHome({ ...baseCtx, streakState: "at-risk" }).mood).toBe("worried");
  });

  it("goal-met → cheer", () => {
    expect(mascotHome({ ...baseCtx, todayCount: 5 }).mood).toBe("cheer");
  });

  it("has-due → happy（復習メッセージ）", () => {
    const r = mascotHome({ ...baseCtx, dueCount: 3 });
    expect(r.mood).toBe("happy");
    expect(r.message).toContain("復習");
  });

  it("default → happy（あと n 問）", () => {
    const r = mascotHome({ ...baseCtx, todayCount: 2, dueCount: 0 });
    expect(r.mood).toBe("happy");
    expect(r.message).toContain("問");
  });

  it("結果が旧ネスト if-else と一致（後方互換）", () => {
    // 各条件で mascotHome の出力が期待通りの mood になることを確認
    const cases: Array<[Partial<MascotContext>, MascotMood]> = [
      [{ streakState: "none" }, "happy"],
      [{ streakState: "broken" }, "sad"],
      [{ streakState: "at-risk" }, "worried"],
      [{ todayCount: 10, dailyGoal: 5 }, "cheer"],
      [{ dueCount: 2 }, "happy"],
      [{}, "happy"],
    ];
    for (const [override, expectedMood] of cases) {
      expect(mascotHome({ ...baseCtx, ...override }).mood).toBe(expectedMood);
    }
  });
});

// ---- II-147: tipIndexForDay メモ化 ----
describe("tipIndexForDay（II-147）", () => {
  beforeEach(() => clearTipIndexCache());

  it("同一日は同じインデックスを返す（参照一致）", () => {
    const r1 = tipIndexForDay(100);
    const r2 = tipIndexForDay(100);
    expect(r1).toBe(r2);
  });

  it("mascotTip(tipIndexForDay(d)) が有効な文字列を返す", () => {
    const idx = tipIndexForDay(0);
    expect(typeof mascotTip(idx)).toBe("string");
    expect(mascotTip(idx).length).toBeGreaterThan(0);
  });

  it("日が変わると異なるインデックスになりうる（同じにはならない場合が多い）", () => {
    const i1 = tipIndexForDay(0);
    const i2 = tipIndexForDay(1);
    // インデックスが異なるか、または同じでも範囲内
    expect(i1).toBeGreaterThanOrEqual(0);
    expect(i2).toBeGreaterThanOrEqual(0);
  });

  it("負の dayIndex も安全に処理する", () => {
    const idx = tipIndexForDay(-5);
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(typeof mascotTip(idx)).toBe("string");
  });
});
