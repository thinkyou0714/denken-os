/**
 * time.ts — 時間関連の共有定数（lib 全体・web から参照）。
 *
 * 背景: DAY_MS / JST_OFFSET_MS が lib/scheduler/types.ts・lib/notify/schedule.ts・
 * lib/scheduler/diagnosis.ts・web/src 等に重複して定義されていた（根本原因 R3）。
 * このファイルに一元化することでコピペドリフトとタイムゾーンバグの温床を排除する。
 *
 * 後方互換: lib/scheduler/types.ts は本ファイルから re-export するため
 * 既存の `import { DAY_MS } from "../scheduler/types.js"` は変更不要。
 */

/**
 * 1日のミリ秒数 (24 * 60 * 60 * 1000 = 86_400_000)。
 * スケジューラ・通知・診断等で共通して使う「日→ms 変換係数」。
 */
export const DAY_MS = 86_400_000;

/**
 * JST (UTC+9) のオフセット（ミリ秒）。
 * epoch ms に加算すると JST の 0 時起点の日番号計算に使える。
 *
 * 例: `Math.floor((epochMs + JST_OFFSET_MS) / DAY_MS)` で JST 日番号を得る。
 */
export const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
