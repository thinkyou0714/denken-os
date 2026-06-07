/**
 * migrate: 保存スキーマの版数と移行シーム（純関数）。
 */
import { describe, expect, it } from "vitest";
import { migrateSnapshot, SCHEMA_VERSION_KEY, STORAGE_VERSION } from "../../web/src/migrate.js";

describe("migrateSnapshot（schema-version seam）", () => {
  it("現行版数は 1、版数キーは denken:schema-version", () => {
    expect(STORAGE_VERSION).toBe(1);
    expect(SCHEMA_VERSION_KEY).toBe("denken:schema-version");
  });

  it("現行版からは identity（データ不変・版数据え置き）", () => {
    const data = { "denken:reviews": "{}", "denken:logs": "[]" };
    const out = migrateSnapshot(data, STORAGE_VERSION);
    expect(out.data).toEqual(data);
    expect(out.version).toBe(STORAGE_VERSION);
  });

  it("版数 0（印無し旧データ）は現行へ引き上げ（migrator 空ゆえデータは素通し）", () => {
    const data = { "denken:reviews": '{"理論":{}}' };
    const out = migrateSnapshot(data, 0);
    expect(out.data).toEqual(data);
    expect(out.version).toBe(STORAGE_VERSION);
  });

  it("版数不明（NaN）は 0 扱いで現行へ stamp", () => {
    const out = migrateSnapshot({ x: "1" }, Number.NaN);
    expect(out.version).toBe(STORAGE_VERSION);
    expect(out.data).toEqual({ x: "1" });
  });

  it("入力を破壊しない（コピーを返す）", () => {
    const data = { a: "1" };
    const out = migrateSnapshot(data, 0);
    out.data.a = "mutated";
    expect(data.a).toBe("1");
  });
});
