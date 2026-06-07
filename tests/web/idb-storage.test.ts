/**
 * IdbBackedStorage: IndexedDB を裏に持つ同期 StorageLike アダプタ。
 * DOM/IndexedDB 型に触れない注入式 AsyncKv フェイク(MemoryKv)で hydrate/移行/write-through/flush を検証する
 * （fake-indexeddb 不要）。LocalProgress を被せて同期 API の透過性も確認する。
 */
import { describe, expect, it } from "vitest";
import type { AsyncKv } from "../../web/src/async-kv.js";
import { IdbBackedStorage } from "../../web/src/idb-storage.js";
import { SCHEMA_VERSION_KEY } from "../../web/src/migrate.js";
import { LocalProgress, type StorageLike } from "../../web/src/store.js";

/** DOM 無しで AsyncKv を満たすメモリ実装（テスト専用）。 */
class MemoryKv implements AsyncKv {
  readonly store = new Map<string, string>();
  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }
  async set(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }
  async getAll(): Promise<Record<string, string>> {
    return Object.fromEntries(this.store);
  }
}

/** 同期 StorageLike のメモリ実装（移行元 localStorage の代役）。 */
class MemoryStorage implements StorageLike {
  private m = new Map<string, string>();
  constructor(seed?: Record<string, string>) {
    if (seed) for (const [k, v] of Object.entries(seed)) this.m.set(k, v);
  }
  getItem(k: string): string | null {
    return this.m.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    this.m.set(k, v);
  }
}

describe("IdbBackedStorage", () => {
  it("初回 hydrate で localStorage を IDB へ移行し版数を stamp する", async () => {
    const kv = new MemoryKv();
    const ls = new MemoryStorage({ "denken:reviews": '{"理論":{"reps":1}}', "denken:logs": "[]" });
    const s = new IdbBackedStorage(kv, { migrationSource: ls });
    await s.hydrate();
    expect(s.getItem("denken:reviews")).toBe('{"理論":{"reps":1}}'); // メモリへ載る
    expect(kv.store.get("denken:reviews")).toBe('{"理論":{"reps":1}}'); // IDB にも書かれる
    expect(kv.store.get(SCHEMA_VERSION_KEY)).toBe("1"); // 版数 stamp
  });

  it("版数印がある既存 IDB は localStorage を無視する（冪等・上書き防止）", async () => {
    const kv = new MemoryKv();
    kv.store.set(SCHEMA_VERSION_KEY, "1");
    kv.store.set("denken:reviews", '{"from":"idb"}');
    const ls = new MemoryStorage({ "denken:reviews": '{"from":"localStorage"}' });
    const s = new IdbBackedStorage(kv, { migrationSource: ls });
    await s.hydrate();
    expect(s.getItem("denken:reviews")).toBe('{"from":"idb"}'); // 新しい IDB が勝つ
  });

  it("setItem は同期で読め、flush 後に IDB へ反映される", async () => {
    const kv = new MemoryKv();
    const s = new IdbBackedStorage(kv);
    await s.hydrate();
    s.setItem("denken:logs", "[1,2,3]");
    expect(s.getItem("denken:logs")).toBe("[1,2,3]"); // await 無しで読める（同期契約）
    await s.flush();
    expect(kv.store.get("denken:logs")).toBe("[1,2,3]"); // write-through 反映
  });

  it("flush は複数の in-flight 書き込みを待つ", async () => {
    const kv = new MemoryKv();
    const s = new IdbBackedStorage(kv);
    await s.hydrate();
    s.setItem("a", "1");
    s.setItem("b", "2");
    s.setItem("c", "3");
    await s.flush();
    expect(kv.store.get("a")).toBe("1");
    expect(kv.store.get("b")).toBe("2");
    expect(kv.store.get("c")).toBe("3");
  });

  it("LocalProgress を被せても透過: record→flush→別インスタンス再 hydrate で復元", async () => {
    const kv = new MemoryKv();
    const a = new IdbBackedStorage(kv);
    await a.hydrate();
    const pa = new LocalProgress(a);
    pa.record("理論", true, Date.UTC(2026, 0, 10), 5000, "T-1");
    await a.flush();

    // 同じ KV から別の IdbBackedStorage を hydrate → 状態が IndexedDB 経由で復元される。
    const b = new IdbBackedStorage(kv);
    await b.hydrate();
    const pb = new LocalProgress(b);
    expect(pb.getReview("理論")).toBeDefined();
    expect(pb.logs().length).toBe(1);
  });

  it("IDB が空でも壊れない（migrationSource 無し）", async () => {
    const kv = new MemoryKv();
    const s = new IdbBackedStorage(kv);
    await s.hydrate();
    expect(s.getItem("denken:reviews")).toBeNull();
    expect(kv.store.get(SCHEMA_VERSION_KEY)).toBe("1");
  });
});
