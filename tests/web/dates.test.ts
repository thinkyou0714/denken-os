import { describe, expect, it } from "vitest";
import { DAY_MS, dayIndex, JST_OFFSET_MS, sameJstDay } from "../../web/src/dates.js";

describe("dates — JST 日付ユーティリティ", () => {
  it("DAY_MS は 86_400_000 ミリ秒", () => {
    expect(DAY_MS).toBe(86_400_000);
  });

  it("JST_OFFSET_MS は 9 時間 = 32_400_000 ms", () => {
    expect(JST_OFFSET_MS).toBe(9 * 60 * 60 * 1000);
  });

  it("dayIndex: UTC 0 epoch は JST 日番号 0（1970-01-01 JST）", () => {
    expect(dayIndex(0)).toBe(0);
  });

  it("dayIndex: 同じ JST 日なら同じ番号を返す", () => {
    // 2026-01-10T00:00:00Z (JST: 2026-01-10T09:00:00)
    const t1 = Date.UTC(2026, 0, 10, 0, 0, 0);
    // 2026-01-10T14:00:00Z (JST: 2026-01-10T23:00:00)
    const t2 = Date.UTC(2026, 0, 10, 14, 0, 0);
    expect(dayIndex(t1)).toBe(dayIndex(t2));
  });

  it("dayIndex: JST 日境界（UTC 15:00 = JST 翌 00:00）で日が変わる", () => {
    // UTC 2026-01-09T14:59:59Z → JST 2026-01-09T23:59:59 → 日番号 A
    const before = Date.UTC(2026, 0, 9, 14, 59, 59);
    // UTC 2026-01-09T15:00:00Z → JST 2026-01-10T00:00:00 → 日番号 A+1
    const after = Date.UTC(2026, 0, 9, 15, 0, 0);
    expect(dayIndex(after)).toBe(dayIndex(before) + 1);
  });

  it("dayIndex: UTC 日境界（offset=0）では UTC 0:00 で変わる", () => {
    const before = Date.UTC(2026, 0, 9, 23, 59, 59);
    const after = Date.UTC(2026, 0, 10, 0, 0, 0);
    expect(dayIndex(after, 0)).toBe(dayIndex(before, 0) + 1);
  });

  it("sameJstDay: 同じ JST 日なら true", () => {
    const t1 = Date.UTC(2026, 0, 10, 1, 0);
    const t2 = Date.UTC(2026, 0, 10, 12, 0);
    expect(sameJstDay(t1, t2)).toBe(true);
  });

  it("sameJstDay: 異なる JST 日なら false", () => {
    // UTC 2026-01-09T14:00:00Z → JST 2026-01-09T23:00:00
    const t1 = Date.UTC(2026, 0, 9, 14, 0);
    // UTC 2026-01-09T15:00:00Z → JST 2026-01-10T00:00:00
    const t2 = Date.UTC(2026, 0, 9, 15, 0);
    expect(sameJstDay(t1, t2)).toBe(false);
  });

  it("sameJstDay: UTC 22:00（JST 翌 07:00）は翌日扱い", () => {
    // JST の朝7時が前日にならないことを確認（ストリーク不具合の根本）。
    const day1 = Date.UTC(2026, 0, 10, 14, 0); // JST 2026-01-10 23:00
    const day2 = Date.UTC(2026, 0, 10, 15, 0); // JST 2026-01-11 00:00
    expect(sameJstDay(day1, day2)).toBe(false);
  });
});
