import { describe, expect, it } from "vitest";
import { buildStudyPlan, daysUntil } from "../../web/src/plan.js";
import {
  DEFAULT_DAILY_GOAL,
  DEFAULT_EXAM_DATE,
  getDailyGoal,
  getExamDate,
  getSound,
  getTheme,
  setDailyGoal,
  setExamDate,
  setSound,
  setTheme,
} from "../../web/src/settings.js";
import { MemoryStorage } from "../helpers/storage.js";

describe("plan（試験カウントダウン・日次計画）", () => {
  it("daysUntil: 未来の試験日まで残り日数（JST暦日）", () => {
    const now = Date.parse("2026-06-09T00:00:00+09:00");
    expect(daysUntil("2026-06-19", now)).toBe(10);
    expect(daysUntil("2026-06-09", now)).toBe(0);
  });

  it("daysUntil: 過ぎた試験日は0", () => {
    const now = Date.parse("2026-09-01T00:00:00+09:00");
    expect(daysUntil("2026-08-30", now)).toBe(0);
  });

  it("buildStudyPlan: 残り日数から1日あたりの推奨問題数（2巡）を算出", () => {
    const now = Date.parse("2026-06-09T00:00:00+09:00");
    const plan = buildStudyPlan({
      examDateIso: "2026-06-19",
      totalProblems: 100,
      todayCount: 5,
      dailyGoal: 10,
      nowMs: now,
    });
    expect(plan.daysLeft).toBe(10);
    expect(plan.recommendedPerDay).toBe(20); // ceil(100*2/10)
    expect(plan.metToday).toBe(false);
    expect(plan.weeksLeft).toBe(2);
  });

  it("buildStudyPlan: 今日の目標達成を判定", () => {
    const plan = buildStudyPlan({
      examDateIso: "2026-08-30",
      totalProblems: 50,
      todayCount: 12,
      dailyGoal: 10,
    });
    expect(plan.metToday).toBe(true);
  });
});

describe("settings（試験日・1日目標の永続化）", () => {
  it("既定値を返し、設定すると永続化される", () => {
    const s = new MemoryStorage();
    expect(getExamDate(s)).toBe(DEFAULT_EXAM_DATE);
    expect(getDailyGoal(s)).toBe(DEFAULT_DAILY_GOAL);
    setExamDate(s, "2026-11-16");
    setDailyGoal(s, 25);
    expect(getExamDate(s)).toBe("2026-11-16");
    expect(getDailyGoal(s)).toBe(25);
  });

  it("不正な試験日は無視、目標は範囲にクランプ", () => {
    const s = new MemoryStorage();
    setExamDate(s, "not-a-date");
    expect(getExamDate(s)).toBe(DEFAULT_EXAM_DATE);
    setDailyGoal(s, 9999);
    expect(getDailyGoal(s)).toBe(200);
    setDailyGoal(s, 0);
    expect(getDailyGoal(s)).toBe(1);
  });

  it("テーマ設定: 既定system、light/darkを永続化、不正はsystem", () => {
    const s = new MemoryStorage();
    expect(getTheme(s)).toBe("system");
    setTheme(s, "dark");
    expect(getTheme(s)).toBe("dark");
    setTheme(s, "light");
    expect(getTheme(s)).toBe("light");
    s.setItem("denken:theme", "weird");
    expect(getTheme(s)).toBe("system");
  });

  it("効果音設定: 既定オン、オフ/オンを永続化", () => {
    const s = new MemoryStorage();
    expect(getSound(s)).toBe(true);
    setSound(s, false);
    expect(getSound(s)).toBe(false);
    setSound(s, true);
    expect(getSound(s)).toBe(true);
  });
});
