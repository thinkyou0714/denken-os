/**
 * templates-physics.test.ts — 物理制約ヘルパーのテスト（II-102, II-103, II-105）。
 *   constrainRange / isNonNegative / POWER_FACTOR_TOLERANCE の境界を検証する。
 */
import { describe, expect, it } from "vitest";
import { constrainRange, isNonNegative, POWER_FACTOR_TOLERANCE } from "../../lib/engine/templates/helpers.js";

describe("constrainRange", () => {
  it("閉区間 [min, max] の境界値を含む（true）", () => {
    expect(constrainRange(0, 0, 100)).toBe(true);
    expect(constrainRange(100, 0, 100)).toBe(true);
    expect(constrainRange(50, 0, 100)).toBe(true);
  });

  it("範囲外の値を拒否する（false）", () => {
    expect(constrainRange(-0.001, 0, 100)).toBe(false);
    expect(constrainRange(100.001, 0, 100)).toBe(false);
  });

  it("min === max の単点区間", () => {
    expect(constrainRange(5, 5, 5)).toBe(true);
    expect(constrainRange(4.999, 5, 5)).toBe(false);
    expect(constrainRange(5.001, 5, 5)).toBe(false);
  });

  it("オプションの name 引数を渡しても動作が変わらない", () => {
    expect(constrainRange(50, 0, 100, "test_param")).toBe(true);
    expect(constrainRange(-1, 0, 100, "test_param")).toBe(false);
  });

  it("浮動小数点の境界値", () => {
    expect(constrainRange(0.6, 0.6, 0.9)).toBe(true);
    expect(constrainRange(0.9, 0.6, 0.9)).toBe(true);
    expect(constrainRange(0.5999, 0.6, 0.9)).toBe(false);
    expect(constrainRange(0.9001, 0.6, 0.9)).toBe(false);
  });
});

describe("isNonNegative", () => {
  it("ゼロは非負（true）", () => {
    expect(isNonNegative(0)).toBe(true);
  });

  it("正の値は非負（true）", () => {
    expect(isNonNegative(1)).toBe(true);
    expect(isNonNegative(0.001)).toBe(true);
    expect(isNonNegative(1e9)).toBe(true);
  });

  it("負の値は拒否（false）", () => {
    expect(isNonNegative(-0.001)).toBe(false);
    expect(isNonNegative(-1)).toBe(false);
    expect(isNonNegative(-1e9)).toBe(false);
  });

  it("NaN は拒否（false）", () => {
    expect(isNonNegative(Number.NaN)).toBe(false);
  });
});

describe("POWER_FACTOR_TOLERANCE", () => {
  it("値が 1e-9 である（II-103）", () => {
    expect(POWER_FACTOR_TOLERANCE).toBe(1e-9);
  });

  it("cos φ ≤ 1 の物理的上限チェックに使用できる", () => {
    const cosPhi = 1.0 + 5e-10; // 浮動小数誤差レベルの超過
    expect(cosPhi - 1 <= POWER_FACTOR_TOLERANCE).toBe(true);

    const cosPhi2 = 1.0 + 2e-9; // 許容外の超過
    expect(cosPhi2 - 1 <= POWER_FACTOR_TOLERANCE).toBe(false);
  });
});
