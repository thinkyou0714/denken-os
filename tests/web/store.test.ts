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

  it("復習期日が到来した topic を dueTopics で返す（SRS 連携）", () => {
    const p = new LocalProgress(new MemoryStorage());
    const now = Date.UTC(2026, 0, 10);
    p.record("理論", true, now); // 次回は未来 → 今は due でない
    expect(p.dueTopics(now)).not.toContain("理論");
    expect(p.dueTopics(now + 365 * DAY)).toContain("理論"); // 十分先なら due
  });

  it("直近不正解の topic を wrongTopics で返す（間違い直し）", () => {
    const p = new LocalProgress(new MemoryStorage());
    const now = Date.UTC(2026, 0, 10);
    p.record("法規", false, now);
    expect(p.wrongTopics()).toContain("法規");
    p.record("法規", true, now + DAY); // 直近が正解になれば外れる
    expect(p.wrongTopics()).not.toContain("法規");
  });

  it("科目別正答率を subjectAccuracy で集計する（合格到達度の素地）", () => {
    const p = new LocalProgress(new MemoryStorage());
    const now = Date.UTC(2026, 0, 10);
    p.record("B種接地抵抗", true, now, undefined, "法規");
    p.record("低圧電路の絶縁抵抗", false, now, undefined, "法規");
    p.record("三相交流電力", true, now, undefined, "理論");
    const acc = p.subjectAccuracy();
    const houki = acc.find((a) => a.subject === "法規")!;
    expect(houki.attempts).toBe(2);
    expect(houki.accuracy).toBeCloseTo(0.5);
    // 低正答率順（法規0.5 が 理論1.0 より先）
    expect(acc[0]!.subject).toBe("法規");
  });

  it("subject 未指定の旧ログは科目集計に含めない（後方互換）", () => {
    const p = new LocalProgress(new MemoryStorage());
    p.record("旧問題", true, Date.UTC(2026, 0, 10)); // subject なし
    expect(p.subjectAccuracy()).toEqual([]);
  });
});
