/**
 * tests/shared/time.test.ts — lib/shared/time.ts の定数テスト。
 *
 * DAY_MS / JST_OFFSET_MS の値と、既存の後方互換 re-export
 * （lib/scheduler/types.ts からの DAY_MS）を確認する。
 */
import { describe, expect, it } from "vitest";
// 後方互換 re-export の確認
import { DAY_MS as DAY_MS_FROM_TYPES } from "../../lib/scheduler/types.js";
import { DAY_MS, JST_OFFSET_MS } from "../../lib/shared/time.js";

describe("lib/shared/time", () => {
  it("DAY_MS は 86_400_000 ms（24時間）", () => {
    expect(DAY_MS).toBe(86_400_000);
    expect(DAY_MS).toBe(24 * 60 * 60 * 1000);
  });

  it("JST_OFFSET_MS は 9時間分のミリ秒", () => {
    expect(JST_OFFSET_MS).toBe(9 * 60 * 60 * 1000);
    expect(JST_OFFSET_MS).toBe(32_400_000);
  });

  it("scheduler/types.ts の DAY_MS は shared/time.ts と同一値（後方互換）", () => {
    expect(DAY_MS_FROM_TYPES).toBe(DAY_MS);
  });

  it("JST 日番号計算: epoch 0 は 1970-01-01 JST(=day 0)", () => {
    // epoch 0 (UTC 1970-01-01 00:00:00) は JST では 1970-01-01 09:00:00
    // floor((0 + 32_400_000) / 86_400_000) = floor(32_400_000 / 86_400_000) = 0
    const dayNumber = Math.floor((0 + JST_OFFSET_MS) / DAY_MS);
    expect(dayNumber).toBe(0);
  });

  it("JST 日番号計算: JST 翌日 00:00:00 は day 1", () => {
    // JST 1970-01-02 00:00:00 = UTC 1970-01-01 15:00:00 = epoch 54_000_000
    const jstMidnight2 = DAY_MS - JST_OFFSET_MS; // UTC の 1970-01-01 15:00
    const dayNumber = Math.floor((jstMidnight2 + JST_OFFSET_MS) / DAY_MS);
    expect(dayNumber).toBe(1);
  });
});
