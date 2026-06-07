/**
 * persistent-storage: persist 要求判断。
 */
import { describe, expect, it } from "vitest";
import { shouldRequestPersist } from "../../web/src/persist.js";

describe("shouldRequestPersist", () => {
  it("未 persist かつ意味あるデータ有 → 要求する", () => {
    expect(shouldRequestPersist({ persisted: false, hasMeaningfulData: true })).toBe(true);
  });

  it("既 persist → 要求しない", () => {
    expect(shouldRequestPersist({ persisted: true, hasMeaningfulData: true })).toBe(false);
  });

  it("データ無し → 要求しない（初回ノイズ回避）", () => {
    expect(shouldRequestPersist({ persisted: false, hasMeaningfulData: false })).toBe(false);
  });
});
