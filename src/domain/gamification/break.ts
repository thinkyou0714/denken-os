/** Retrieval break(短い休憩)を推奨する閾値。研究: 10〜15 分が最適とされる。 */
export const BREAK_RECOMMEND_AFTER_MIN = 15;

/**
 * 連続学習セッションが指定分を超えたかを判定する純関数。
 * UI 側で「短い休憩を挟むと記憶定着が上がる」と穏やかに提案する。
 */
export function shouldRecommendBreak(
  sessionStart: Date,
  now: Date,
  thresholdMin: number = BREAK_RECOMMEND_AFTER_MIN,
): boolean {
  return (now.getTime() - sessionStart.getTime()) / 60_000 >= thresholdMin;
}
