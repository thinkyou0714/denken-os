/**
 * migrate.ts — ブラウザ永続データの schema-version と移行シーム（純ロジック）。
 *
 * localStorage→IndexedDB 化に伴い「保存データの形が将来変わる」場面が出る。これまで
 * SM-2→FSRS の後方互換は read 時に reviewStateToCard が個別吸収していたが、版数を明示し、
 * 起動時に一度だけ snapshot を変換する seam を用意する（散在する read-time 互換の置き場）。
 * backup.ts の BACKUP_VERSION と同じ家風（版数フィールドを持ち、migrator は必要時に足す）。
 */

/** 現行の保存スキーマ版数。破壊的な保存形変更のたびに +1 し MIGRATORS に変換を足す。 */
export const STORAGE_VERSION = 1;

/** KV / localStorage 上で版数を刻むキー。 */
export const SCHEMA_VERSION_KEY = "denken:schema-version";

/** 版 n のデータを版 n+1 へ変換する純関数。 */
type Migrator = (data: Record<string, string>) => Record<string, string>;

/**
 * 版数 → そこから次版への migrator。現状は v1 が初版で破壊的変更が無いため空。
 * 例: 将来 reviews の形を変えるなら `1: (d) => ({ ...d, "denken:reviews": transform(d["denken:reviews"]) })`。
 */
const MIGRATORS: Record<number, Migrator> = {};

/**
 * 保存 snapshot を現行版へ引き上げる。fromVersion から STORAGE_VERSION まで
 * 順に migrator を適用し（無い段は素通し）、現行版数を添えて返す。
 * 版数不明（印が無い旧データ）は fromVersion=0 として現行まで引き上げる。
 */
export function migrateSnapshot(
  data: Record<string, string>,
  fromVersion: number,
): { data: Record<string, string>; version: number } {
  let cur: Record<string, string> = { ...data };
  let v = Number.isFinite(fromVersion) ? Math.max(0, Math.floor(fromVersion)) : 0;
  while (v < STORAGE_VERSION) {
    const m = MIGRATORS[v];
    if (m) cur = m(cur);
    v += 1;
  }
  return { data: cur, version: STORAGE_VERSION };
}
