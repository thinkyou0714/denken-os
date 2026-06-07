/**
 * async-kv.ts — 非同期 key/value バックエンドの契約（DOM 非依存）。
 * idb.ts（IndexedDB 実装、DOM 型を使う）と idb-storage.ts（同期アダプタ、DOM 非依存）と
 * テストの MemoryKv フェイクが共有する。DOM lib 無しの root tsconfig でも型検査できるよう、
 * IndexedDB 型を含むファイルから分離してここに置く。
 */
export interface AsyncKv {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  getAll(): Promise<Record<string, string>>;
}
