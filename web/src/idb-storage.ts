/**
 * idb-storage.ts — IndexedDB を裏に持つ同期 StorageLike アダプタ。
 *
 * 設計の核心: LocalProgress の「同期読み取り API」を壊さないため、起動時に全件をメモリ Map へ
 * hydrate し、getItem/setItem は Map に対して同期で答える。書き込みは Map 更新 + 非同期
 * write-through（fire-and-forget）。これで app.ts の grade/render を async 化せずに済む。
 *
 * IndexedDB 型には触れず、注入された AsyncKv だけに依存する（DOM 無しのテスト環境で MemoryKv で検証可能）。
 */
import type { AsyncKv } from "./async-kv.js";
import { migrateSnapshot, SCHEMA_VERSION_KEY, STORAGE_VERSION } from "./migrate.js";
import type { StorageLike } from "./store.js";

/** localStorage から IndexedDB へ初回移行する対象キー（進捗の hot state）。 */
const HOT_KEYS = ["denken:reviews", "denken:logs", "denken:lapses"];

export class IdbBackedStorage implements StorageLike {
  private cache = new Map<string, string>();
  /** write-through を直列化する保留チェーン（順序保証 + flush 待ち合わせ用）。 */
  private pending: Promise<void> = Promise.resolve();

  constructor(
    private kv: AsyncKv,
    private opts: { migrationSource?: StorageLike } = {},
  ) {}

  getItem(key: string): string | null {
    return this.cache.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.cache.set(key, value);
    this.enqueue(key, value);
  }

  /** 書き込みを保留チェーンに積む。失敗は握り潰し in-memory のみに degrade（UI を壊さない）。 */
  private enqueue(key: string, value: string): void {
    this.pending = this.pending.then(() => this.kv.set(key, value)).catch(() => {});
  }

  private commit(snapshot: Record<string, string>): void {
    for (const [k, v] of Object.entries(snapshot)) {
      this.cache.set(k, v);
      this.enqueue(k, v);
    }
  }

  /**
   * 起動時に一度呼ぶ。KV をメモリへ読み込む。版数印が無ければ初回として localStorage から移行し、
   * 旧版なら snapshot を migrate して再 stamp する。
   */
  async hydrate(): Promise<void> {
    const existing = await this.kv.getAll();
    const stamp = existing[SCHEMA_VERSION_KEY];

    if (stamp !== undefined) {
      const from = Number(stamp);
      if (Number.isFinite(from) && from < STORAGE_VERSION) {
        // 既存 IDB ユーザの版上げ: hot データを migrate して再 stamp。
        const hot: Record<string, string> = {};
        for (const [k, v] of Object.entries(existing)) if (k !== SCHEMA_VERSION_KEY) hot[k] = v;
        const { data, version } = migrateSnapshot(hot, from);
        this.commit({ ...data, [SCHEMA_VERSION_KEY]: String(version) });
        await this.flush();
      } else {
        // 現行版: そのままメモリへ。localStorage は触らない（新しい IDB を旧 localStorage で潰さない）。
        for (const [k, v] of Object.entries(existing)) this.cache.set(k, v);
      }
      return;
    }

    // 初回: localStorage の hot key を移行（あれば）→ 版数を付与して KV へ書き出す。
    const src: Record<string, string> = {};
    const ls = this.opts.migrationSource;
    if (ls) {
      for (const k of HOT_KEYS) {
        const v = ls.getItem(k);
        if (v !== null) src[k] = v;
      }
    }
    const { data, version } = migrateSnapshot(src, 0);
    this.commit({ ...data, [SCHEMA_VERSION_KEY]: String(version) });
    await this.flush();
  }

  /** 進行中の write-through を待つ（pagehide で最後の書き込みの取りこぼしを減らす）。 */
  async flush(): Promise<void> {
    await this.pending;
  }
}
