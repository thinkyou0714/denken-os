import { describe, expect, it } from "vitest";
import { ACHIEVEMENTS, evaluateAchievements, newlyUnlocked } from "../../web/src/achievements.js";
import type { WebAnswerLog } from "../../web/src/store.js";

const DAY0 = Date.UTC(2026, 0, 5, 3, 0, 0); // 2026-01-05 12:00 JST

function log(over: Partial<WebAnswerLog> = {}): WebAnswerLog {
  return { topic: "三相交流電力", correct: true, atMs: DAY0, rating: "good", ...over };
}

function unlockedIds(views: ReturnType<typeof evaluateAchievements>): Set<string> {
  return new Set(views.filter((v) => v.unlocked).map((v) => v.id));
}

describe("evaluateAchievements", () => {
  it("ログなしは何も解除されない", () => {
    const got = unlockedIds(evaluateAchievements({ logs: [], streakDays: 0, level: 1 }));
    expect(got.size).toBe(0);
  });

  it("1問解くと「はじめの一歩」", () => {
    const got = unlockedIds(evaluateAchievements({ logs: [log()], streakDays: 1, level: 1 }));
    expect(got.has("first")).toBe(true);
    expect(got.has("solve10")).toBe(false);
  });

  it("蓄積系: 10問・コンボ3が同時に判定される", () => {
    const logs = Array.from({ length: 10 }, (_, i) => log({ atMs: DAY0 + i * 1000 }));
    const got = unlockedIds(evaluateAchievements({ logs, streakDays: 1, level: 1 }));
    expect(got.has("solve10")).toBe(true);
    expect(got.has("combo3")).toBe(true);
    expect(got.has("perfectday")).toBe(true); // 5問以上全問正解
  });

  it("ストリーク・レベルは引数から判定（お守り込みの実効値を渡せる）", () => {
    const got = unlockedIds(evaluateAchievements({ logs: [log()], streakDays: 30, level: 10 }));
    expect(got.has("streak7")).toBe(true);
    expect(got.has("streak30")).toBe(true);
    expect(got.has("level10")).toBe(true);
    expect(got.has("level40")).toBe(false);
  });

  it("全科目踏破は subjectOf 対応表で判定する", () => {
    const subjects = ["理論", "電力", "機械", "法規", "電力管理", "機械制御"];
    const map = new Map(subjects.map((s, i) => [`論点${i}`, s]));
    const logs = subjects.map((_, i) => log({ topic: `論点${i}`, atMs: DAY0 + i * 1000 }));
    const got = unlockedIds(evaluateAchievements({ logs, streakDays: 1, level: 1, subjectOf: map }));
    expect(got.has("allsubjects")).toBe(true);
  });

  it("朝活（7時前）と夜ふくろう（22時以降）は JST 時刻で判定", () => {
    const morning = Date.UTC(2026, 0, 5, 21, 0); // JST 翌6:00
    const night = Date.UTC(2026, 0, 5, 13, 30); // JST 22:30
    const got = unlockedIds(
      evaluateAchievements({ logs: [log({ atMs: morning }), log({ atMs: night })], streakDays: 1, level: 1 }),
    );
    expect(got.has("morning")).toBe(true);
    expect(got.has("night")).toBe(true);
  });

  it("不死鳥: 3日以上のブランクからの復帰で解除", () => {
    const logs = [log({ atMs: DAY0 }), log({ atMs: DAY0 + 5 * 86_400_000 })];
    const got = unlockedIds(evaluateAchievements({ logs, streakDays: 1, level: 1 }));
    expect(got.has("phoenix")).toBe(true);
  });

  it("不正解を含む日はパーフェクトデーにならない", () => {
    const logs = [
      ...Array.from({ length: 5 }, (_, i) => log({ atMs: DAY0 + i * 1000 })),
      log({ atMs: DAY0 + 9000, correct: false, rating: "again" }),
    ];
    const got = unlockedIds(evaluateAchievements({ logs, streakDays: 1, level: 1 }));
    expect(got.has("perfectday")).toBe(false);
  });
});

describe("newlyUnlocked（新規解除の検出）", () => {
  it("表示済みIDを除いた解除分だけ返す", () => {
    const views = evaluateAchievements({ logs: [log()], streakDays: 7, level: 1 });
    const fresh = newlyUnlocked(views, new Set(["first"]));
    expect(fresh.some((v) => v.id === "first")).toBe(false);
    expect(fresh.some((v) => v.id === "streak7")).toBe(true);
  });
});

describe("カタログの整合性", () => {
  it("id は一意", () => {
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
  });

  it("各実績に icon/title/desc がある", () => {
    for (const a of ACHIEVEMENTS) {
      expect(a.icon.length).toBeGreaterThan(0);
      expect(a.title.length).toBeGreaterThan(0);
      expect(a.desc.length).toBeGreaterThan(0);
    }
  });
});
