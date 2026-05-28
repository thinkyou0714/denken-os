import { describe, it, expect } from "vitest";
import {
  xpForReview,
  levelFromXP,
  xpToNextLevel,
  rankFromXP,
  passZonePercent,
  xpSummary,
} from "@/domain/gamification/xp";
import { problems } from "@/data/problems";
import type { Problem } from "@/domain/content/schema";
import type { ReviewRecord } from "@/domain/progress/store";

const easy: Problem = problems.find((p) => p.difficulty === 1)!;
const hard: Problem = problems.find((p) => p.difficulty >= 3)!;

describe("XP 計算", () => {
  it("難易度 1 正答 = 10、難易度 3 正答 = 14、誤答 = 0", () => {
    expect(xpForReview(easy, true)).toBe(10);
    expect(xpForReview(hard, true)).toBe(10 + 2 * (hard.difficulty - 1));
    expect(xpForReview(easy, false)).toBe(0);
  });

  it("levelFromXP は平方則 (Lv n に n^2*30 XP 必要)", () => {
    expect(levelFromXP(0)).toBe(0);
    expect(levelFromXP(30)).toBe(1);
    expect(levelFromXP(120)).toBe(2);
    expect(levelFromXP(270)).toBe(3);
    expect(levelFromXP(29)).toBe(0);
  });

  it("xpToNextLevel は現レベル内の進捗を返す", () => {
    const r = xpToNextLevel(50);
    expect(r.xpInLevel).toBe(20); // Lv1=30, +20
    expect(r.xpForLevel).toBe(90); // Lv2=120, 120-30=90
  });

  it("rankFromXP は段階的に昇格", () => {
    expect(rankFromXP(0)).toBe("3種学習者");
    expect(rankFromXP(300)).toBe("3種挑戦者");
    expect(rankFromXP(3000)).toBe("2種挑戦者");
    expect(rankFromXP(10_000)).toBe("1種研究者");
  });

  it("passZonePercent は 3000XP で 100% 上限", () => {
    expect(passZonePercent(0)).toBe(0);
    expect(passZonePercent(1500)).toBe(50);
    expect(passZonePercent(3000)).toBe(100);
    expect(passZonePercent(5000)).toBe(100);
  });

  it("xpSummary は科目別 XP と総合を集計する", () => {
    const logs: ReviewRecord[] = [
      {
        problemId: easy.id,
        grade: "good",
        correct: true,
        reviewedAt: "2026-05-01T00:00:00Z",
      },
      {
        problemId: easy.id,
        grade: "again",
        correct: false,
        reviewedAt: "2026-05-02T00:00:00Z",
      },
    ];
    const s = xpSummary(problems, logs);
    expect(s.total).toBe(xpForReview(easy, true));
    expect(s.perSubject[easy.subject]).toBe(xpForReview(easy, true));
    expect(s.level).toBe(levelFromXP(s.total));
  });
});
