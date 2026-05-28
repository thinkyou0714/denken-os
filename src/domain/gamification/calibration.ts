import type { Confidence, ReviewRecord } from "@/domain/progress/store";

export interface CalibrationStats {
  /** 自信度を記録した解答数(無記録は除外)。 */
  total: number;
  /** 自信=高で誤答した回数(過信)。 */
  overconfident: number;
  /** 自信=低で正答した回数(謙虚)。 */
  underconfident: number;
  /** 自信と結果が整合した回数(その他は中立扱い)。 */
  calibrated: number;
  /** 校正スコア 0〜100(=calibrated/total)。total=0 なら 0。 */
  score: number;
}

/**
 * メタ認知の校正度合いを集計する。
 * - 自信=高(2) かつ 誤答 → 過信
 * - 自信=低(0) かつ 正答 → 謙虚
 * - それ以外 → 校正済(中立扱い含む)
 *
 * このシンプルなバケット分けで「過信を矯正したい」というメタ認知矯正の
 * ファーストレベルの可視化を提供する(より精緻な Brier score 等は v2)。
 */
export function calibrationStats(logs: ReviewRecord[]): CalibrationStats {
  const tracked = logs.filter((l) => l.confidence !== undefined);
  let overconfident = 0;
  let underconfident = 0;
  for (const l of tracked) {
    const c = l.confidence as Confidence;
    if (c === 2 && !l.correct) overconfident += 1;
    else if (c === 0 && l.correct) underconfident += 1;
  }
  const total = tracked.length;
  const calibrated = total - overconfident - underconfident;
  const score = total === 0 ? 0 : Math.round((calibrated / total) * 100);
  return { total, overconfident, underconfident, calibrated, score };
}
