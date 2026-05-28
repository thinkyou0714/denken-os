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

/** ブラウザ用 localStorage 実装。
 *
 * プライベートブラウズ等で localStorage が無効/容量超過時、ブラウザは throw する。
 * その場合は in-memory フォールバックで silently 動作させ、アプリを壊さない。
 */
export function localStorageBackend(key: string): StorageBackend {
  return {
    read: () => {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    write: (v) => {
      try {
        localStorage.setItem(key, v);
      } catch {
        // private mode / quota exceeded: アプリは続行する(セッション内のみ保持)。
      }
    },
    remove: () => {
      try {
        localStorage.removeItem(key);
      } catch {
        // noop
      }
    },
  };
}
