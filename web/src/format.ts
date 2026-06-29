/**
 * format.ts — 表示用の小さな整形関数（純ロジック）。
 * 時間表示は「読んだ瞬間に意味が取れる」ことを優先する（秒は分:秒、長時間は分）。
 */

/** 経過時間を人に読める形へ（例: 42秒 / 2分05秒）。負値・NaN は 0秒。 */
export function formatElapsed(ms: number): string {
  const s = Number.isFinite(ms) ? Math.max(0, Math.round(ms / 1000)) : 0;
  if (s < 60) return `${s}秒`;
  const m = Math.floor(s / 60);
  return `${m}分${String(s % 60).padStart(2, "0")}秒`;
}

/** 残り時間を mm:ss で（カウントダウン表示用）。負値は 0:00 に張り付ける。 */
export function formatRemaining(ms: number): string {
  const s = Number.isFinite(ms) ? Math.max(0, Math.floor(ms / 1000)) : 0;
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** 数値を指定範囲へ収める。NaN は下限へ寄せる。 */
export function clamp(n: number, min: number, max: number): number {
  const value = Number.isFinite(n) ? n : min;
  return Math.min(max, Math.max(min, value));
}

/** 数値を 0..1 に収める。 */
export function clamp01(n: number): number {
  return clamp(n, 0, 1);
}

/** クエスト等の進捗率を 0..100 の整数パーセントへ変換する。 */
export function progressPercent(value: number, target: number): number {
  if (!Number.isFinite(target) || target <= 0) return 0;
  return clamp(Math.round((value / target) * 100), 0, 100);
}
