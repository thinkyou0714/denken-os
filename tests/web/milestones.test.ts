import { describe, expect, it } from "vitest";
import { evaluateAchievements } from "../../web/src/achievements.js";
import { passedStreakMilestone, STREAK_MILESTONES } from "../../web/src/retention.js";
import { ghostRace, MASTER_EASY_COUNT, masteredTopics } from "../../web/src/stats.js";
import type { WebAnswerLog } from "../../web/src/store.js";

const DAY_MS = 86_400_000;
const DAY0 = Date.UTC(2026, 0, 5, 3, 0, 0); // 2026-01-05 12:00 JST

function log(over: Partial<WebAnswerLog> = {}): WebAnswerLog {
  return { topic: "三相交流電力", correct: true, atMs: DAY0, rating: "good", ...over };
}

function unlockedIds(views: ReturnType<typeof evaluateAchievements>): Set<string> {
  return new Set(views.filter((v) => v.unlocked).map((v) => v.id));
}

describe("passedStreakMilestone（大台の通過検出）", () => {
  it("大台ちょうどで検出する", () => {
    expect(passedStreakMilestone(30, 0)).toBe(30);
    expect(passedStreakMilestone(100, 50)).toBe(100);
  });

  it("大台未満・祝賀済みは null", () => {
    expect(passedStreakMilestone(29, 0)).toBeNull();
    expect(passedStreakMilestone(30, 30)).toBeNull();
    expect(passedStreakMilestone(7, 0)).toBeNull(); // 7日は週次（お守り）が担う
  });

  it("ちょうどの日を逃しても通過済みの最大の大台を返す（お守りブリッジで一気に伸びるケース）", () => {
    expect(passedStreakMilestone(55, 0)).toBe(50);
    expect(passedStreakMilestone(120, 30)).toBe(100);
  });

  it("大台リストは昇順", () => {
    const sorted = [...STREAK_MILESTONES].sort((a, b) => a - b);
    expect([...STREAK_MILESTONES]).toEqual(sorted);
  });
});

describe("masteredTopics（論点マスター）", () => {
  it("easy 評価が規定回数に達した論点だけ返す", () => {
    const logs = [
      ...Array.from({ length: MASTER_EASY_COUNT }, (_, i) => log({ atMs: DAY0 + i * 1000, rating: "easy" })),
      log({ atMs: DAY0 + 9000, topic: "変圧器効率", rating: "easy" }),
      log({ atMs: DAY0 + 9500, topic: "変圧器効率", rating: "good" }),
    ];
    expect(masteredTopics(logs)).toEqual(["三相交流電力"]);
  });

  it("good/hard はカウントしない・空ログは空", () => {
    expect(masteredTopics([log(), log(), log()])).toEqual([]);
    expect(masteredTopics([])).toEqual([]);
  });
});

describe("ghostRace（過去7日の自分との競争）", () => {
  it("今日が平均超えなら beat=true", () => {
    const r = ghostRace([10, 10, 10, 10, 10, 10, 10, 20]);
    expect(r.today).toBe(20);
    expect(r.avg).toBe(10);
    expect(r.beat).toBe(true);
  });

  it("平均以下なら beat=false・今日0は beat=false", () => {
    expect(ghostRace([20, 20, 20, 20, 20, 20, 20, 10]).beat).toBe(false);
    expect(ghostRace([0, 0, 0, 0, 0, 0, 0, 0]).beat).toBe(false);
  });

  it("空配列は安全にゼロ", () => {
    expect(ghostRace([])).toEqual({ today: 0, avg: 0, beat: false });
  });
});

describe("新実績（初マスター・無傷の三十日・月間皆勤賞）", () => {
  it("初マスター: easy×3 で解除", () => {
    const logs = Array.from({ length: 3 }, (_, i) => log({ atMs: DAY0 + i * 1000, rating: "easy" }));
    const got = unlockedIds(evaluateAchievements({ logs, streakDays: 1, level: 1 }));
    expect(got.has("master1")).toBe(true);
  });

  it("無傷の三十日: ストリーク30以上かつお守り未消費で解除、消費があれば未解除", () => {
    const clean = unlockedIds(evaluateAchievements({ logs: [log()], streakDays: 30, level: 1, usedFreezeDays: [] }));
    expect(clean.has("nofreeze30")).toBe(true);
    const saved = unlockedIds(
      evaluateAchievements({ logs: [log()], streakDays: 30, level: 1, usedFreezeDays: [20000] }),
    );
    expect(saved.has("nofreeze30")).toBe(false);
  });

  it("月間皆勤賞: 同じ暦月に20日学習で解除", () => {
    const logs = Array.from({ length: 20 }, (_, i) => log({ atMs: DAY0 + i * DAY_MS })); // 1/5〜1/24
    const got = unlockedIds(evaluateAchievements({ logs, streakDays: 1, level: 1 }));
    expect(got.has("month20")).toBe(true);
  });

  it("月をまたいで分散した20日は解除しない", () => {
    // 1/25〜2/13 の20日連続 → 1月7日+2月13日でどちらも20日未満。
    const start = Date.UTC(2026, 0, 25, 3, 0, 0);
    const logs = Array.from({ length: 20 }, (_, i) => log({ atMs: start + i * DAY_MS }));
    const got = unlockedIds(evaluateAchievements({ logs, streakDays: 1, level: 1 }));
    expect(got.has("month20")).toBe(false);
  });
});
