import { describe, expect, it } from "vitest";
import {
  bridgeWithFreezes,
  FREEZE_AWARD_EVERY,
  FREEZE_CAP,
  FREEZE_KEY,
  loadFreezeState,
  maybeAwardFreeze,
  saveFreezeState,
  streakBreakdown,
  streakWithFreezes,
  studiedDays,
} from "../../web/src/freeze.js";
import { MemoryStorage } from "../helpers/storage.js";

describe("loadFreezeState / saveFreezeState", () => {
  it("未保存は初期状態（0個・消費なし）", () => {
    const s = loadFreezeState(new MemoryStorage());
    expect(s).toEqual({ count: 0, usedDays: [], lastAwardStreak: 0, restDays: [] });
  });

  it("ラウンドトリップで保存・復元できる", () => {
    const storage = new MemoryStorage();
    saveFreezeState(storage, { count: 2, usedDays: [100, 101], lastAwardStreak: 14, restDays: [] });
    expect(loadFreezeState(storage)).toEqual({ count: 2, usedDays: [100, 101], lastAwardStreak: 14, restDays: [] });
  });

  it("壊れたJSON・型不一致は初期状態へフォールバック", () => {
    const storage = new MemoryStorage();
    storage.setItem(FREEZE_KEY, "{broken");
    expect(loadFreezeState(storage).count).toBe(0);
    storage.setItem(FREEZE_KEY, JSON.stringify({ count: "many", usedDays: "x", lastAwardStreak: null }));
    expect(loadFreezeState(storage)).toEqual({ count: 0, usedDays: [], lastAwardStreak: 0, restDays: [] });
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
    const state = { count: 1, usedDays: [], lastAwardStreak: 7, restDays: [] };
    const r = bridgeWithFreezes(state, new Set([100, 101]), 103); // 102 欠席
    expect(r.bridgedDays).toEqual([102]);
    expect(r.state.count).toBe(0);
    expect(r.state.usedDays).toContain(102);
    expect(streakWithFreezes(new Set([100, 101]), r.state.usedDays, 103)).toBe(3);
  });

  it("欠席2日は2個あれば繋ぐ・1個では繋がない（温存）", () => {
    const days = new Set([100]);
    const r2 = bridgeWithFreezes({ count: 2, usedDays: [], lastAwardStreak: 0, restDays: [] }, days, 103);
    expect(r2.bridgedDays).toEqual([101, 102]);
    const r1 = bridgeWithFreezes({ count: 1, usedDays: [], lastAwardStreak: 0, restDays: [] }, days, 103);
    expect(r1.bridgedDays).toEqual([]);
    expect(r1.state.count).toBe(1); // 消費されない
  });

  it("欠席なし・履歴なしでは何もしない", () => {
    const none = bridgeWithFreezes({ count: 2, usedDays: [], lastAwardStreak: 0, restDays: [] }, new Set(), 103);
    expect(none.bridgedDays).toEqual([]);
    const cont = bridgeWithFreezes({ count: 2, usedDays: [], lastAwardStreak: 0, restDays: [] }, new Set([102]), 103);
    expect(cont.bridgedDays).toEqual([]);
  });

  it("過去の消費日も「継続日」として起点に使う", () => {
    // 101 はお守り消費済み、102 を欠席 → 残り1個で繋がる。
    const state = { count: 1, usedDays: [101], lastAwardStreak: 0, restDays: [] };
    const r = bridgeWithFreezes(state, new Set([100]), 103);
    expect(r.bridgedDays).toEqual([102]);
  });
});

describe("maybeAwardFreeze（7日ごとの獲得）", () => {
  it("7の倍数の節目で1個獲得し、同じ節目では二重獲得しない", () => {
    const a = maybeAwardFreeze({ count: 0, usedDays: [], lastAwardStreak: 0, restDays: [] }, FREEZE_AWARD_EVERY);
    expect(a.awarded).toBe(true);
    expect(a.state.count).toBe(1);
    const b = maybeAwardFreeze(a.state, FREEZE_AWARD_EVERY);
    expect(b.awarded).toBe(false);
  });

  it("節目以外では獲得しない", () => {
    expect(maybeAwardFreeze({ count: 0, usedDays: [], lastAwardStreak: 0, restDays: [] }, 6).awarded).toBe(false);
    expect(maybeAwardFreeze({ count: 0, usedDays: [], lastAwardStreak: 0, restDays: [] }, 0).awarded).toBe(false);
  });

  it("上限（FREEZE_CAP）を超えて保持できない・枠が空けば次の節目で受け取れる", () => {
    const full = { count: FREEZE_CAP, usedDays: [], lastAwardStreak: 7, restDays: [] };
    const r = maybeAwardFreeze(full, 14);
    expect(r.awarded).toBe(false);
    expect(r.state.lastAwardStreak).toBe(7); // 進めない＝後で受け取れる
    const spent = { ...r.state, count: 1 };
    expect(maybeAwardFreeze(spent, 14).awarded).toBe(true);
  });

  it("ストリークが途切れて作り直したら、過去の節目記録に縛られず7日で再獲得できる", () => {
    // 以前 28 日まで到達 → 途切れて新ストリーク 7 日目: 旧記録(28)は現在と無関係なので付与する。
    const r = maybeAwardFreeze({ count: 0, usedDays: [], lastAwardStreak: 28, restDays: [] }, 7);
    expect(r.awarded).toBe(true);
    expect(r.state.lastAwardStreak).toBe(7);
    // 同じ新ストリーク内での二重獲得はしない。
    expect(maybeAwardFreeze(r.state, 7).awarded).toBe(false);
  });

  it("節目を過ぎてからでも取りこぼさない（既存の長期継続ユーザーへのキャッチアップ）", () => {
    // ストリーク30で初めて機能に触れた場合: 最後に通過した節目(28)分として1個受け取れる。
    const r = maybeAwardFreeze({ count: 0, usedDays: [], lastAwardStreak: 0, restDays: [] }, 30);
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

describe("streakBreakdown（学習日 vs 肩代わり日の区別・#62）", () => {
  it("全て学習日なら coveredDays=0", () => {
    const studied = new Set([10, 9, 8]);
    const bd = streakBreakdown(studied, [], 10);
    expect(bd).toEqual({ total: 3, studiedDays: 3, coveredDays: 0 });
  });

  it("肩代わり日を分けて数える（連続の中に欠席カバーが混ざる）", () => {
    // 今日(10)・8 を学習、9 はお守りで肩代わり → 連続3日（学習2・肩代わり1）。
    const studied = new Set([10, 8]);
    const bd = streakBreakdown(studied, [9], 10);
    expect(bd.total).toBe(3);
    expect(bd.studiedDays).toBe(2);
    expect(bd.coveredDays).toBe(1);
  });

  it("学習記録があれば肩代わり指定と重複しても『学習』に数える", () => {
    const studied = new Set([10, 9]);
    const bd = streakBreakdown(studied, [9], 10); // 9 は学習済みなので学習として数える
    expect(bd.studiedDays).toBe(2);
    expect(bd.coveredDays).toBe(0);
  });

  it("継続していなければ全て0", () => {
    const studied = new Set([5]);
    expect(streakBreakdown(studied, [], 10)).toEqual({ total: 0, studiedDays: 0, coveredDays: 0 });
  });

  it("昨日起点でも内訳を返す（今日未学習・昨日まで継続）", () => {
    const studied = new Set([9, 8]);
    const bd = streakBreakdown(studied, [], 10); // 今日(10)は未学習、昨日(9)から遡る
    expect(bd.total).toBe(2);
    expect(bd.studiedDays).toBe(2);
  });
});
