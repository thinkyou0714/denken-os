/**
 * dates.ts — 日付ユーティリティ（JST 固定）。
 *
 * 設計意図: 電験は国内試験で受験者は JST 生活のため、日境界は JST(UTC+9) 固定。
 * UTC 日境界を使うと朝7時(JST)の学習が UTC では前日扱いになりストリークが途切れる
 * 不具合が生じる。このモジュールで一元管理することで web/src 全体で重複を根絶する。
 *
 * 参照元: store.ts / quests.ts / retention.ts / dashboard.ts の重複定義を置換。
 */

/** 1日のミリ秒数。 */
export const DAY_MS = 86_400_000;

/**
 * 日本標準時のタイムゾーンオフセット（ミリ秒）。
 * 日境界は JST 固定（電験は国内試験・受験者は JST 生活のため）。
 */
export const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/**
 * epoch ms を JST 日番号へ変換する。
 * 同一日の判定・ストリーク計算・クエスト抽選種に使う。
 * @param ms epoch ミリ秒
 * @param offsetMs タイムゾーンオフセット（既定 JST_OFFSET_MS）
 */
export function dayIndex(ms: number, offsetMs: number = JST_OFFSET_MS): number {
  return Math.floor((ms + offsetMs) / DAY_MS);
}

/**
 * 2つの epoch ms が同じ JST 日かどうかを返す。
 * @param a epoch ミリ秒
 * @param b epoch ミリ秒
 * @param offsetMs タイムゾーンオフセット（既定 JST_OFFSET_MS）
 */
export function sameJstDay(a: number, b: number, offsetMs: number = JST_OFFSET_MS): boolean {
  return dayIndex(a, offsetMs) === dayIndex(b, offsetMs);
}
