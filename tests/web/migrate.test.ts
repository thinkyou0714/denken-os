/**
 * tests/web/migrate.test.ts — localStorage スキーマ版とマイグレーション足場（II-10）。
 *
 * 現状の runMigrations は no-op（版の記録のみ）。版の読み出し・記録・冪等性を検証する。
 */
import { describe, expect, it } from "vitest";
import { readSchemaVersion, runMigrations, SCHEMA_VERSION, SCHEMA_VERSION_KEY } from "../../web/src/migrate.js";
import { MemoryStorage } from "../helpers/storage.js";

describe("migrate（スキーマ版・マイグレーション）", () => {
  it("未設定の版は 0 として読む", () => {
    expect(readSchemaVersion(new MemoryStorage())).toBe(0);
  });

  it("不正な版（非数値・負）は 0 にフォールバックする", () => {
    const s = new MemoryStorage();
    s.setItem(SCHEMA_VERSION_KEY, "abc");
    expect(readSchemaVersion(s)).toBe(0);
    s.setItem(SCHEMA_VERSION_KEY, "-3");
    expect(readSchemaVersion(s)).toBe(0);
  });

  it("初回起動で現行版を記録する（from=0 → to=SCHEMA_VERSION）", () => {
    const s = new MemoryStorage();
    const r = runMigrations(s);
    expect(r.from).toBe(0);
    expect(r.to).toBe(SCHEMA_VERSION);
    expect(readSchemaVersion(s)).toBe(SCHEMA_VERSION);
    // 現状は構造変換なしなので migrated は false。
    expect(r.migrated).toBe(false);
  });

  it("既に現行版なら再度書き込まない（冪等）", () => {
    const s = new MemoryStorage();
    s.setItem(SCHEMA_VERSION_KEY, String(SCHEMA_VERSION));
    const r = runMigrations(s);
    expect(r.from).toBe(SCHEMA_VERSION);
    expect(r.to).toBe(SCHEMA_VERSION);
    expect(readSchemaVersion(s)).toBe(SCHEMA_VERSION);
  });

  it("2回連続実行しても安定して現行版になる", () => {
    const s = new MemoryStorage();
    runMigrations(s);
    const r2 = runMigrations(s);
    expect(r2.from).toBe(SCHEMA_VERSION);
    expect(readSchemaVersion(s)).toBe(SCHEMA_VERSION);
  });
});
