/**
 * 永続化のための最小インターフェース。
 * これを差し替えることで localStorage / IndexedDB / Supabase などに対応できる
 * (将来のクラウド同期の接続点)。
 */
export interface StorageBackend {
  read(): string | null;
  write(value: string): void;
  remove(): void;
}

/** テスト・SSR 用のインメモリ実装。 */
export function memoryBackend(initial: string | null = null): StorageBackend {
  let value = initial;
  return {
    read: () => value,
    write: (v) => {
      value = v;
    },
    remove: () => {
      value = null;
    },
  };
}

/** ブラウザ用 localStorage 実装。 */
export function localStorageBackend(key: string): StorageBackend {
  return {
    read: () => localStorage.getItem(key),
    write: (v) => localStorage.setItem(key, v),
    remove: () => localStorage.removeItem(key),
  };
}
