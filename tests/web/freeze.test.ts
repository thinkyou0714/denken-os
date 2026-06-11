import { describe, expect, it } from "vitest";
import {
  bridgeWithFreezes,
  FREEZE_AWARD_EVERY,
  FREEZE_CAP,
  FREEZE_KEY,
  loadFreezeState,
  maybeAwardFreeze,
  saveFreezeState,
  streakWithFreezes,
  studiedDays,
} from "../../web/src/freeze.js";
import type { StorageLike } from "../../web/src/store.js";

class MemoryStorage implements StorageLike {
  m = new Map<string, string>();
  getItem(k: string): string | null {
    return this.m.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    this.m.set(k, v);
  }
}

describe("loadFreezeState / saveFreezeState", () => {
  it("未保存は初期状態（0個・消費なし）", () => {
    const s = loadFreezeState(new MemoryStorage());
    expect(s).toEqual({ count: 0, usedDays: [], lastAwardStreak: 0 });
  });

  it("ラウンドトリップで保存・復元できる", () => {
    const storage = new MemoryStorage();
    saveFreezeState(storage, { count: 2, usedDays: [100, 101], lastAwardStreak: 14 });
    expect(loadFreezeState(storage)).toEqual({ count: 2, usedDays: [100, 101], lastAwardStreak: 14 });
  });

  it("壊れたJSON・型不一致は初期状態へフォールバック", () => {
    const storage = new MemoryStorage();
    storage.setItem(FREEZE_KEY, "{broken");
    expect(loadFreezeState(storage).count).toBe(0);
    storage.setItem(FREEZE_KEY, JSON.stringify({ count: "many", usedDays: "x", lastAwardStreak: null }));
    expect(loadFreezeState(storage)).toEqual({ count: 0, usedDays: [], lastAwardStreak: 0 });
  });

  it("count は上限でクランプされる", () => {
    const storage = new MemoryStorage();
    storage.setItem(FREEZE_KEY, JSON.stringify({ count: 99, usedDays: [], lastAwardStreak: 0 }));
    expect(loadFreezeState(storage).count).toBe(FREEZE_CAP);
  });
});

describe("streakWithFreezes", () => {
  it("お守り消費日も学習日として連続にカウントする", () => {
    const days = new Set([100, 101, 103]); // 102 を欠席
    expect(streakWithFreezes(days, [], 103)).toBe(1);
    expect(streakWithFreezes(days, [102], 103)).toBe(4);
  });

  it("今日未学習でも昨日まで継続中なら維持（store.streakDays と同じ規則）", () => {
    const days = new Set([100, 101]);
    expect(streakWithFreezes(days, [], 102)).toBe(2);
    expect(streakWithFreezes(days, [], 103)).toBe(0);
  });
});

describe("bridgeWithFreezes（欠席日の自動肩代わり）", () => {
  it("欠席1日を1個で繋ぐ", () => {
    const state = { count: 1, usedDays: [], lastAwardStreak: 7 };
    const r = bridgeWithFreezes(state, new Set([100, 101]), 103); // 102 欠席
    expect(r.bridgedDays).toEqual([102]);
    expect(r.state.count).toBe(0);
    expect(r.state.usedDays).toContain(102);
    expect(streakWithFreezes(new Set([100, 101]), r.state.usedDays, 103)).toBe(3);
  });

  it("欠席2日は2個あれば繋ぐ・1個では繋がない（温存）", () => {
    const days = new Set([100]);
    const r2 = bridgeWithFreezes({ count: 2, usedDays: [], lastAwardStreak: 0 }, days, 103);
    expect(r2.bridgedDays).toEqual([101, 102]);
    const r1 = bridgeWithFreezes({ count: 1, usedDays: [], lastAwardStreak: 0 }, days, 103);
    expect(r1.bridgedDays).toEqual([]);
    expect(r1.state.count).toBe(1); // 消費されない
  });

  it("欠席なし・履歴なしでは何もしない", () => {
    const none = bridgeWithFreezes({ count: 2, usedDays: [], lastAwardStreak: 0 }, new Set(), 103);
    expect(none.bridgedDays).toEqual([]);
    const cont = bridgeWithFreezes({ count: 2, usedDays: [], lastAwardStreak: 0 }, new Set([102]), 103);
    expect(cont.bridgedDays).toEqual([]);
  });

  it("過去の消費日も「継続日」として起点に使う", () => {
    // 101 はお守り消費済み、102 を欠席 → 残り1個で繋がる。
    const state = { count: 1, usedDays: [101], lastAwardStreak: 0 };
    const r = bridgeWithFreezes(state, new Set([100]), 103);
    expect(r.bridgedDays).toEqual([102]);
  });
});

describe("maybeAwardFreeze（7日ごとの獲得）", () => {
  it("7の倍数の節目で1個獲得し、同じ節目では二重獲得しない", () => {
    const a = maybeAwardFreeze({ count: 0, usedDays: [], lastAwardStreak: 0 }, FREEZE_AWARD_EVERY);
    expect(a.awarded).toBe(true);
    expect(a.state.count).toBe(1);
    const b = maybeAwardFreeze(a.state, FREEZE_AWARD_EVERY);
    expect(b.awarded).toBe(false);
  });

  it("節目以外では獲得しない", () => {
    expect(maybeAwardFreeze({ count: 0, usedDays: [], lastAwardStreak: 0 }, 6).awarded).toBe(false);
    expect(maybeAwardFreeze({ count: 0, usedDays: [], lastAwardStreak: 0 }, 0).awarded).toBe(false);
  });

  it("上限（FREEZE_CAP）を超えて保持できない・枠が空けば次の節目で受け取れる", () => {
    const full = { count: FREEZE_CAP, usedDays: [], lastAwardStreak: 7 };
    const r = maybeAwardFreeze(full, 14);
    expect(r.awarded).toBe(false);
    expect(r.state.lastAwardStreak).toBe(7); // 進めない＝後で受け取れる
    const spent = { ...r.state, count: 1 };
    expect(maybeAwardFreeze(spent, 14).awarded).toBe(true);
  });

  it("節目を過ぎてからでも取りこぼさない（既存の長期継続ユーザーへのキャッチアップ）", () => {
    // ストリーク30で初めて機能に触れた場合: 最後に通過した節目(28)分として1個受け取れる。
    const r = maybeAwardFreeze({ count: 0, usedDays: [], lastAwardStreak: 0 }, 30);
    expect(r.awarded).toBe(true);
    expect(r.state.lastAwardStreak).toBe(28);
    // 同じストリークのうちは二重獲得しない。
    expect(maybeAwardFreeze(r.state, 30).awarded).toBe(false);
    // 35日に到達すれば次の節目分を受け取れる。
    expect(maybeAwardFreeze(r.state, 35).awarded).toBe(true);
  });
});

describe("studiedDays", () => {
  it("解答ログから JST 日番号の集合を作る", () => {
    const atMs = Date.UTC(2026, 0, 5, 3, 0, 0); // 2026-01-05 12:00 JST
    const days = studiedDays([{ topic: "t", correct: true, atMs }]);
    expect(days.size).toBe(1);
  });

  it("JST 0時前後で日が分かれる（UTC 15:00 = JST 翌0:00）", () => {
    const before = Date.UTC(2026, 0, 5, 14, 59); // JST 23:59
    const after = Date.UTC(2026, 0, 5, 15, 0); // JST 翌日 0:00
    const days = studiedDays([
      { topic: "t", correct: true, atMs: before },
      { topic: "t", correct: true, atMs: after },
    ]);
    expect(days.size).toBe(2);
  });
});
