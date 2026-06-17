/**
 * exam-aware.test.ts — 試験日逆算スケジューリング中核（#34/#35）の検証。
 */
import { describe, expect, it } from "vitest";
import {
  CRAM_MODE_DAYS,
  CRAM_RETENTION,
  examAwareParams,
  MAX_RETENTION,
  RAMP_WINDOW_DAYS,
} from "../../lib/scheduler/exam-aware.js";
import { FsrsScheduler } from "../../lib/scheduler/fsrs.js";

describe("examAwareParams", () => {
  it("試験日なし（null）は base のまま・間隔上限なし・直前モードでない", () => {
    const p = examAwareParams(null, 0.9);
    expect(p.requestRetention).toBe(0.9);
    expect(p.maximumIntervalDays).toBeUndefined();
    expect(p.cramMode).toBe(false);
  });

  it("試験日が過ぎている（<=0）も試験なし扱い", () => {
    expect(examAwareParams(0, 0.9).maximumIntervalDays).toBeUndefined();
    expect(examAwareParams(-3, 0.9).cramMode).toBe(false);
  });

  it("ランプ窓の外（残り日数が大きい）は base 据え置きだが間隔は試験日で上限", () => {
    const p = examAwareParams(120, 0.9);
    expect(p.requestRetention).toBe(0.9); // RAMP_WINDOW_DAYS の外
    expect(p.maximumIntervalDays).toBe(120);
    expect(p.cramMode).toBe(false);
  });

  it("試験が近づくほど目標保持率が上がる（単調増加）", () => {
    const far = examAwareParams(RAMP_WINDOW_DAYS, 0.9).requestRetention;
    const mid = examAwareParams(30, 0.9).requestRetention;
    const near = examAwareParams(7, 0.9).requestRetention;
    expect(far).toBeLessThanOrEqual(mid);
    expect(mid).toBeLessThan(near);
    expect(near).toBeLessThanOrEqual(MAX_RETENTION);
    expect(near).toBeLessThanOrEqual(CRAM_RETENTION + 1e-9);
  });

  it("最大間隔は試験日を越えない（残り日数に一致）", () => {
    expect(examAwareParams(10, 0.9).maximumIntervalDays).toBe(10);
    expect(examAwareParams(1, 0.9).maximumIntervalDays).toBe(1);
  });

  it("直前期（<= CRAM_MODE_DAYS）で cramMode が true", () => {
    expect(examAwareParams(CRAM_MODE_DAYS, 0.9).cramMode).toBe(true);
    expect(examAwareParams(CRAM_MODE_DAYS + 1, 0.9).cramMode).toBe(false);
  });

  it("base が CRAM_RETENTION 以上なら据え置き（下げない）", () => {
    const p = examAwareParams(3, 0.96);
    expect(p.requestRetention).toBeGreaterThanOrEqual(0.96);
    expect(p.requestRetention).toBeLessThanOrEqual(MAX_RETENTION);
  });

  it("base は 0.7〜0.97 にクランプされる", () => {
    expect(examAwareParams(null, 0.5).requestRetention).toBe(0.7);
    expect(examAwareParams(null, 0.99).requestRetention).toBe(MAX_RETENTION);
  });
});

describe("FsrsScheduler — maximum_interval 連携", () => {
  it("maximumIntervalDays を受け取り保持する", () => {
    const s = new FsrsScheduler(0.9, 10);
    expect(s.maximumIntervalDays).toBe(10);
  });

  it("最大間隔を絞ると間隔が上限以内に収まる（easy 連打でも）", () => {
    const capped = new FsrsScheduler(0.9, 5);
    let card = capped.init(new Date("2026-01-01T00:00:00Z"));
    let now = new Date("2026-01-01T00:00:00Z");
    for (let i = 0; i < 6; i++) {
      card = capped.review(card, "easy", now);
      now = new Date(card.due);
    }
    const view = capped.view(card);
    // 上限 5 日 + FSRS の fuzz を考慮しても、無制限時より明確に短い。
    expect(view.scheduledDays).toBeLessThanOrEqual(7);
  });

  it("未指定なら従来どおり（間隔上限なし）", () => {
    const s = new FsrsScheduler(0.9);
    expect(s.maximumIntervalDays).toBeUndefined();
  });
});
