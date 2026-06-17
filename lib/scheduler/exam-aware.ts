/**
 * exam-aware.ts — 試験日逆算スケジューリングの中核（純関数）。
 *
 * 学習設計監査 #34/#35 の根本是正:
 *   FSRS は本来「期限のない長期保持」を最適化する。しかし電験は **固定の試験日** を持つ
 *   締切駆動の試験であり、近づくほど (1) 目標保持率を上げて復習頻度を増やし、
 *   (2) 試験日を越える間隔を組まない（試験後に復習予定が落ちるのを防ぐ）べきである。
 *   さらに直前期は分散学習から **集中復習（cram/Leitner 的）** へ切り替える。
 *
 * 本モジュールは「残り日数 → 実効 FSRS パラメータ・直前モード可否」を決める純関数のみを提供する。
 * 永続化・UI・選択ロジックは web 層がこの値を参照して配線する（DOM 非依存・テスト可能）。
 */

/** 目標保持率のランプを開始する残り日数（これより内側で base→cram へ線形に上げる）。 */
export const RAMP_WINDOW_DAYS = 60;
/** 直前期（集中復習モード）に入る残り日数。 */
export const CRAM_MODE_DAYS = 14;
/** 直前期に引き上げる目標保持率の上限（ts-fsrs の安全域に収める）。 */
export const CRAM_RETENTION = 0.95;
/** request_retention の物理的な上限（ts-fsrs 既定の許容に合わせる）。 */
export const MAX_RETENTION = 0.97;

export interface ExamAwareParams {
  /** 実効目標保持率（FSRS の request_retention）。 */
  requestRetention: number;
  /** 実効最大間隔（日）。試験日を越えないよう上限を設ける。未設定（=試験なし）は undefined。 */
  maximumIntervalDays: number | undefined;
  /** 直前モード（集中復習を推奨する期間か）。 */
  cramMode: boolean;
}

/** 値を [lo, hi] に収める。 */
function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}

/**
 * 残り日数と基準目標保持率から、試験日を意識した実効 FSRS パラメータを返す。
 *
 * 挙動:
 *  - `daysLeft` が null / 0以下 / 未来でない → 試験なし扱い（base のまま・間隔上限なし）。
 *  - `daysLeft > 0`:
 *      - `maximumIntervalDays = max(1, daysLeft)`（試験日を越える復習を組まない）。
 *      - 目標保持率は `RAMP_WINDOW_DAYS` の内側で base → `CRAM_RETENTION` へ線形に上昇
 *        （ただし base がそれ以上なら据え置き）。上限 `MAX_RETENTION`。
 *      - `cramMode = daysLeft <= CRAM_MODE_DAYS`。
 *
 * @param daysLeft 試験までの残り日数（過ぎている/不明は null）
 * @param baseRetention 設定上の基準目標保持率（既定 0.9。0.7〜0.97 を想定）
 */
export function examAwareParams(daysLeft: number | null, baseRetention = 0.9): ExamAwareParams {
  const base = clamp(baseRetention, 0.7, MAX_RETENTION);
  if (daysLeft === null || !Number.isFinite(daysLeft) || daysLeft <= 0) {
    return { requestRetention: base, maximumIntervalDays: undefined, cramMode: false };
  }
  const maximumIntervalDays = Math.max(1, Math.floor(daysLeft));
  // ランプ係数 t: 試験まで RAMP_WINDOW_DAYS で 0、当日で 1。
  const t = clamp((RAMP_WINDOW_DAYS - daysLeft) / RAMP_WINDOW_DAYS, 0, 1);
  const ramped = base + Math.max(0, CRAM_RETENTION - base) * t;
  const requestRetention = clamp(Number(ramped.toFixed(4)), base, MAX_RETENTION);
  return { requestRetention, maximumIntervalDays, cramMode: daysLeft <= CRAM_MODE_DAYS };
}
