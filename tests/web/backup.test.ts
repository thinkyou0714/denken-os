/**
 * export-import: 学習データの書き出し/取り込み/マージ。
 */
import { describe, expect, it } from "vitest";
import type { AnswerLog } from "../../lib/scheduler/diagnosis.js";
import type { ReviewState } from "../../lib/scheduler/types.js";
import { type Backup, mergeBackup, parseBackup, serializeBackup } from "../../web/src/backup.js";
import { LocalProgress, type StorageLike } from "../../web/src/store.js";

class MemoryStorage implements StorageLike {
  private m = new Map<string, string>();
  getItem(k: string): string | null {
    return this.m.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    this.m.set(k, v);
  }
}

const rs = (dueMs: number, lastReviewMs: number | null = null): ReviewState => ({
  reps: 1,
  lapses: 0,
  intervalDays: 1,
  ease: 2.5,
  dueMs,
  lastReviewMs,
});

describe("backup 純関数", () => {
  it("serialize→parse でラウンドトリップ", () => {
    const reviews = { a: rs(100) };
    const logs: AnswerLog[] = [{ topic: "a", correct: true, atMs: 10 }];
    const parsed = parseBackup(serializeBackup(reviews, logs));
    expect(parsed?.reviews).toEqual(reviews);
    expect(parsed?.logs).toEqual(logs);
  });

  it("壊れた/形状違いの JSON は null", () => {
    expect(parseBackup("{")).toBeNull();
    expect(parseBackup("123")).toBeNull();
    expect(parseBackup('{"version":1}')).toBeNull(); // reviews/logs 欠落
  });

  it("merge は logs 重複排除し reviews は新しい方を採用", () => {
    const existing = {
      reviews: { a: rs(100, 50) },
      logs: [{ topic: "a", correct: true, atMs: 10 }] as AnswerLog[],
    };
    const incoming: Backup = {
      version: 1,
      reviews: { a: rs(200, 150), b: rs(300, 250) },
      logs: [
        { topic: "a", correct: true, atMs: 10 }, // 重複
        { topic: "a", correct: false, atMs: 20 }, // 新規
      ],
    };
    const merged = mergeBackup(existing, incoming);
    expect(merged.logs.length).toBe(2); // 重複は増えない
    expect(merged.reviews.a?.dueMs).toBe(200); // 新しい方(lastReviewMs 150>50)
    expect(merged.reviews.b).toBeDefined();
  });
});

describe("LocalProgress export/import", () => {
  it("別端末データを取り込んでマージできる", () => {
    const a = new LocalProgress(new MemoryStorage());
    a.record("理論", true, Date.UTC(2026, 0, 10));
    const json = a.exportData();

    const b = new LocalProgress(new MemoryStorage());
    b.record("機械", false, Date.UTC(2026, 0, 11));
    expect(b.importData(json)).toBe(true);
    // 自端末(機械) + 取込(理論) の両方が見える。
    const topics = new Set(b.logs().map((l) => l.topic));
    expect(topics.has("理論")).toBe(true);
    expect(topics.has("機械")).toBe(true);
  });

  it("壊れた JSON の取り込みは false で無変更", () => {
    const p = new LocalProgress(new MemoryStorage());
    p.record("理論", true, Date.UTC(2026, 0, 10));
    expect(p.importData("not json")).toBe(false);
    expect(p.logs().length).toBe(1);
  });
});
