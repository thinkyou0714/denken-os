/**
 * migrate.ts — localStorage スキーマのバージョン管理と起動時マイグレーション（純ロジック）。
 *
 * 方針: 進捗データは localStorage の素の JSON で保存しており、将来キー構造を変えると
 *   旧データの読み出しが壊れる。今は構造変更がないため migration は no-op だが、
 *   「現在のスキーマ版を記録し、起動時に未来のマイグレーションを差し込める足場」を先に用意する。
 *   こうしておくと後日の破壊的変更を、旧データを壊さず段階適用できる。
 * StorageLike を受け取り DOM 非依存にしてテスト可能にする。
 */
import type { StorageLike } from "./store.js";

/** localStorage に保存する現在のスキーマ版。構造を変えるたびに +1 する。 */
export const SCHEMA_VERSION = 1;

/** スキーマ版を保存するキー。 */
export const SCHEMA_VERSION_KEY = "denken:schemaVersion";

/** 保存済みのスキーマ版を読む（未設定・不正は 0 = 初期導入前として扱う）。 */
export function readSchemaVersion(storage: StorageLike): number {
  const raw = storage.getItem(SCHEMA_VERSION_KEY);
  const n = raw === null ? Number.NaN : Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

export interface MigrationResult {
  /** マイグレーション前の保存版（0 = 初回 or 未設定）。 */
  from: number;
  /** マイグレーション後の版（= SCHEMA_VERSION）。 */
  to: number;
  /** 実際に何らかの変換を行ったか（no-op の場合 false）。 */
  migrated: boolean;
}

/**
 * 起動時に1回呼ぶマイグレーション。保存版が現行版より古ければ順次変換し、版を更新する。
 * 現時点では構造変更がないため変換ステップは無い（版の記録のみ行う no-op）。
 * 将来の破壊的変更は from < N のときに段階適用するブロックをここへ追加する。
 * @returns 適用結果（from/to/migrated）
 */
export function runMigrations(storage: StorageLike): MigrationResult {
  const from = readSchemaVersion(storage);
  const migrated = false;

  // 例（将来用）:
  // if (from < 2) { ...旧→新キーへの変換...; migrated = true; }

  if (from !== SCHEMA_VERSION) {
    // 版の記録だけでも「初回起動でマイグレーション足場が動いた」ことを永続化する。
    storage.setItem(SCHEMA_VERSION_KEY, String(SCHEMA_VERSION));
  }
  return { from, to: SCHEMA_VERSION, migrated };
}
