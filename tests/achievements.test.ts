import { describe, it, expect } from "vitest";
import {
  computeAchievements,
  todayReviewCount,
} from "@/domain/gamification/achievements";
import { ProgressStore } from "@/domain/progress/store";
import { memoryBackend } from "@/domain/storage/backend";
import { problems, problemsBySubject } from "@/data/problems";

describe("computeAchievements", () => {
  it("学習がゼロのとき全 0", () => {
    const store = new ProgressStore(memoryBackend());
    const a = computeAchievements(problems, store);
    expect(a.memoryLocked).toBe(0);
    expect(a.mastered).toBe(0);
    expect(a.interleaverDays).toBe(0);
  });

  it("1 日に 4 科目すべて触れた日を interleaverDays がカウントする", () => {
    const store = new ProgressStore(memoryBackend());
    const now = new Date("2026-05-28T10:00:00Z");
    for (const subject of ["theory", "power", "machinery", "law"] as const) {
      const p = problemsBySubject(subject)[0];
      store.recordReview(p.id, "good", true, now);
    }
    const a = computeAchievements(problems, store);
    expect(a.interleaverDays).toBe(1);
  });

  it("3 科目のみだと interleaverDays は 0", () => {
    const store = new ProgressStore(memoryBackend());
    const now = new Date("2026-05-28T10:00:00Z");
    for (const subject of ["theory", "power", "machinery"] as const) {
      const p = problemsBySubject(subject)[0];
      store.recordReview(p.id, "good", true, now);
    }
    expect(computeAchievements(problems, store).interleaverDays).toBe(0);
  });
});

describe("todayReviewCount", () => {
  it("今日のレビュー数だけを数える", () => {
    const store = new ProgressStore(memoryBackend());
    const today = new Date(2026, 4, 28, 10);
    const yesterday = new Date(2026, 4, 27, 10);
    store.recordReview("theory-001", "good", true, today);
    store.recordReview("theory-002", "good", true, today);
    store.recordReview("power-001", "good", true, yesterday);
    expect(todayReviewCount(store, today)).toBe(2);
  });
});
