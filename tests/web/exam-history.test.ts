import { describe, expect, it } from "vitest";
import {
  appendExamHistory,
  EXAM_HISTORY_CAP,
  type ExamHistoryEntry,
  loadExamHistory,
  recentScores,
} from "../../web/src/exam-history.js";
import { MemoryStorage, ThrowingStorage } from "../helpers/storage.js";

function entry(over: Partial<ExamHistoryEntry> = {}): ExamHistoryEntry {
  return {
    atMs: Date.UTC(2026, 0, 10),
    preset: "all",
    subjects: ["理論"],
    scorePct: 70,
    total: 10,
    passed: true,
    ...over,
  };
}

describe("exam-history（模試スコア履歴・#13）", () => {
  it("空ストレージは空配列", () => {
    expect(loadExamHistory(new MemoryStorage())).toEqual([]);
  });

  it("追記して保存・復元できる（古い順）", () => {
    const s = new MemoryStorage();
    appendExamHistory(s, entry({ atMs: 1, scorePct: 50 }));
    appendExamHistory(s, entry({ atMs: 2, scorePct: 80 }));
    const h = loadExamHistory(s);
    expect(h.map((e) => e.scorePct)).toEqual([50, 80]);
  });

  it("上限を超えたら古い順に間引く", () => {
    const s = new MemoryStorage();
    for (let i = 0; i < EXAM_HISTORY_CAP + 5; i++) appendExamHistory(s, entry({ atMs: i, scorePct: i }));
    const h = loadExamHistory(s);
    expect(h.length).toBe(EXAM_HISTORY_CAP);
    // 古い5件が落ちて、最も古いスコアは 5 になる。
    expect(h[0]?.scorePct).toBe(5);
  });

  it("壊れた JSON は空配列にフォールバックする", () => {
    const s = new MemoryStorage();
    s.setItem("denken:examHistory", "{ not json");
    expect(loadExamHistory(s)).toEqual([]);
  });

  it("スキーマ不正なエントリは落とす", () => {
    const s = new MemoryStorage();
    s.setItem("denken:examHistory", JSON.stringify([{ foo: 1 }, entry({ scorePct: 42 })]));
    const h = loadExamHistory(s);
    expect(h.length).toBe(1);
    expect(h[0]?.scorePct).toBe(42);
  });

  it("保存失敗（quota）でも throw しない", () => {
    expect(() => appendExamHistory(new ThrowingStorage(), entry())).not.toThrow();
  });

  it("recentScores: 直近 n 件の得点率（古い順）", () => {
    const h = [entry({ scorePct: 10 }), entry({ scorePct: 20 }), entry({ scorePct: 30 })];
    expect(recentScores(h, 2)).toEqual([20, 30]);
    expect(recentScores([], 5)).toEqual([]);
  });
});
