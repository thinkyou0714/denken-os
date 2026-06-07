/**
 * idb.ts — 生 IndexedDB を最小の Promise 化 key/value にした薄いラッパ。
 * 依存を増やさない（idb ライブラリ不使用＝供給網方針）。DOM/IDB 型はこのファイルに閉じ込める。
 * AsyncKv 契約は DOM 非依存の async-kv.ts に置き、テスト/アダプタはそちらだけに依存する
 * （DOM lib 無しの root tsconfig が idb.ts を取り込まないようにするため。idb.ts は app.ts からのみ参照）。
 */
import type { AsyncKv } from "./async-kv.js";

/** 単一 objectStore の IndexedDB を開き、AsyncKv として返す。indexedDB 不在なら reject。 */
export async function openKv(dbName: string, storeName: string): Promise<AsyncKv> {
  if (typeof indexedDB === "undefined") throw new Error("IndexedDB is unavailable");

  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(dbName, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(storeName)) req.result.createObjectStore(storeName);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("indexedDB open failed"));
  });

  const request = <T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> =>
    new Promise<T>((resolve, reject) => {
      const req = run(db.transaction(storeName, mode).objectStore(storeName));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error("indexedDB request failed"));
    });

  return {
    async get(key) {
      const v = await request<unknown>("readonly", (s) => s.get(key));
      return typeof v === "string" ? v : null;
    },
    async set(key, value) {
      await request("readwrite", (s) => s.put(value, key));
    },
    async getAll() {
      // getAllKeys と getAll は同一の昇順で返るため添字で対応づく（IndexedDB の順序保証）。
      const keys = await request<IDBValidKey[]>("readonly", (s) => s.getAllKeys());
      const values = await request<unknown[]>("readonly", (s) => s.getAll());
      const out: Record<string, string> = {};
      keys.forEach((k, i) => {
        if (typeof k === "string" && typeof values[i] === "string") out[k] = values[i] as string;
      });
      return out;
    },
  };
}
