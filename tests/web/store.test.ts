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

describe("LocalProgress（ブラウザ進捗・FSRS）", () => {
  it("正解を記録し FSRS 状態を更新・永続化する（reps が増え、次回は未来に予定）", () => {
    const p = new LocalProgress(new MemoryStorage());
    const now = Date.UTC(2026, 0, 10);
    p.record("三相交流電力", true, now);
    const view = p.record("三相交流電力", true, now);
    const st = p.getCardView("三相交流電力");
    expect(st?.reps).toBe(2);
    expect(view.dueMs).toBeGreaterThan(now); // 次回復習は未来に予定される
    expect(p.logs().length).toBe(2);
  });

  it("4段階評価で記録できる（again=やり直し、easy=正解）", () => {
    const p = new LocalProgress(new MemoryStorage());
    const now = Date.UTC(2026, 0, 10);
    p.record("機械", "again", now);
    p.record("機械", "easy", now);
    const logs = p.logs();
    expect(logs[0]?.rating).toBe("again");
    expect(logs[0]?.correct).toBe(false);
    expect(logs[1]?.rating).toBe("easy");
    expect(logs[1]?.correct).toBe(true);
  });

  it("problemId を記録できる（問題単位分析の素地）", () => {
    const p = new LocalProgress(new MemoryStorage());
    p.record("三相交流電力", true, Date.UTC(2026, 0, 10), 3000, "T-0001");
    expect(p.logs()[0]?.problemId).toBe("T-0001");
  });

  it("復習期限が来た topic を due として返す（未来 now で期限到来）", () => {
    const p = new LocalProgress(new MemoryStorage());
    const now = Date.UTC(2026, 0, 10);
    p.record("理論", true, now);
    // 直後は due ではない（未来に予定）。
    expect(p.dueTopics(now)).not.toContain("理論");
    // 100日後には期限到来。
    expect(p.dueTopics(now + 100 * DAY)).toContain("理論");
  });

  it("目標保持率を設定・取得できる（既定0.9、範囲外はクランプ）", () => {
    const storage = new MemoryStorage();
    const p = new LocalProgress(storage);
    expect(p.desiredRetention()).toBe(0.9);
    p.setDesiredRetention(0.85);
    expect(new LocalProgress(storage).desiredRetention()).toBe(0.85);
    p.setDesiredRetention(0.5); // 下限0.7にクランプ
    expect(new LocalProgress(storage).desiredRetention()).toBe(0.7);
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
    expect(b.getCardView("機械")).toBeDefined();
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
