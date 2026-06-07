import { describe, expect, it } from "vitest";
import { LocalProgress, type StorageLike } from "../../web/src/store.js";

/** DOM 無しでテストするためのメモリ Storage。 */
class MemoryStorage implements StorageLike {
  private m = new Map<string, string>();
  getItem(k: string): string | null {
    return this.m.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    this.m.set(k, v);
  }
}

const DAY = 86_400_000;

describe("LocalProgress（ブラウザ進捗）", () => {
  it("正解/不正解を記録し SM-2 状態を更新・永続化する", () => {
    const p = new LocalProgress(new MemoryStorage());
    const now = Date.UTC(2026, 0, 10);
    p.record("三相交流電力", true, now);
    p.record("三相交流電力", true, now);
    const st = p.getReview("三相交流電力");
    expect(st?.reps).toBe(2);
    expect(p.logs().length).toBe(2);
  });

  it("problemId を記録できる（問題単位分析の素地）", () => {
    const p = new LocalProgress(new MemoryStorage());
    p.record("三相交流電力", true, Date.UTC(2026, 0, 10), 3000, "T-0001");
    expect(p.logs()[0]?.problemId).toBe("T-0001");
  });

  it("連続学習日数を数える（今日まで連続）", () => {
    const p = new LocalProgress(new MemoryStorage());
    const today = Date.UTC(2026, 0, 10);
    p.record("理論", true, today - 2 * DAY);
    p.record("理論", true, today - 1 * DAY);
    p.record("理論", false, today);
    expect(p.streakDays(today)).toBe(3);
  });

  it("途切れた場合は連続日数がリセットされる", () => {
    const p = new LocalProgress(new MemoryStorage());
    const today = Date.UTC(2026, 0, 10);
    p.record("理論", true, today - 5 * DAY); // 飛んでいる
    p.record("理論", true, today);
    expect(p.streakDays(today)).toBe(1);
  });

  it("別インスタンスでも同じ Storage を共有すれば復元できる", () => {
    const storage = new MemoryStorage();
    const a = new LocalProgress(storage);
    a.record("機械", false, Date.UTC(2026, 0, 10));
    const b = new LocalProgress(storage);
    expect(b.logs().length).toBe(1);
    expect(b.getReview("機械")?.lapses).toBe(1);
  });

  it("容量超過(QuotaExceededError)でも record は throw せず、ログを間引いて継続する", () => {
    // logs JSON が一定サイズを超えると QuotaExceededError を投げる Storage。
    class QuotaStorage implements StorageLike {
      private m = new Map<string, string>();
      constructor(private maxLen: number) {}
      getItem(k: string): string | null {
        return this.m.get(k) ?? null;
      }
      setItem(k: string, v: string): void {
        if (k === "denken:logs" && v.length > this.maxLen) {
          const e = new Error("quota") as Error & { name: string };
          e.name = "QuotaExceededError";
          throw e;
        }
        this.m.set(k, v);
      }
    }
    const storage = new QuotaStorage(400);
    const p = new LocalProgress(storage);
    const now = Date.UTC(2026, 0, 10);
    // 上限を超えるまで記録しても例外を投げない。
    for (let i = 0; i < 200; i++) {
      expect(() => p.record("理論", i % 2 === 0, now + i)).not.toThrow();
    }
    // 何らかのログが保持され、review 状態も読める（不整合で全消失しない）。
    expect(p.logs().length).toBeGreaterThan(0);
    expect(p.getReview("理論")).toBeDefined();
  });

  it("日境界は既定 JST（UTC 22時=JST翌07時の学習が『今日』に入る）", () => {
    const p = new LocalProgress(new MemoryStorage()); // 既定 JST(+9h)
    // 2026-01-10T22:00:00Z = JST 2026-01-11 07:00。JST では「11日」の学習。
    p.record("理論", true, Date.UTC(2026, 0, 10, 22, 0), 10 * 60_000);
    // now = JST 2026-01-11 09:00 → 同じ JST 日なので今日の学習時間に算入される。
    const nowJst11 = Date.UTC(2026, 0, 11, 0, 0);
    expect(p.todayMinutes(nowJst11)).toBe(10);
    // 参考: UTC 日境界(offset=0)なら別日扱いで 0 分になる。
    const utc = new LocalProgress(new MemoryStorage(), 0);
    utc.record("理論", true, Date.UTC(2026, 0, 10, 22, 0), 10 * 60_000);
    expect(utc.todayMinutes(nowJst11)).toBe(0);
  });
});
