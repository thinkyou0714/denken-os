/**
 * diagnosis.ts — 弱点診断（05-adaptive-diagnosis）。
 * topic 単位の「正答率」＋「次回復習が来ているか(due)」の二層で
 * 今日やるべき弱点 topic を優先度順に返す。スケジューラ実装に依存しない。
 */
import { DAY_MS } from "../shared/time.js";

export interface TopicProgress {
  topic: string;
  attempts: number;
  correct: number;
  /** 次回復習予定(epoch ms)。過去なら due。 */
  dueMs: number;
}

export interface AnswerLog {
  topic: string;
  correct: boolean;
  timeMs?: number;
  atMs: number;
  /** 任意: どの問題に対する解答か（問題単位の集計・誤答分析の素地）。 */
  problemId?: string;
}

/** 解答ログから topic 別の集計を作る（dueMs は外部スケジューラで更新する前提の素地）。 */
export function aggregateByTopic(logs: AnswerLog[]): Map<string, TopicProgress> {
  const m = new Map<string, TopicProgress>();
  for (const log of logs) {
    const cur = m.get(log.topic) ?? { topic: log.topic, attempts: 0, correct: 0, dueMs: log.atMs };
    cur.attempts += 1;
    if (log.correct) cur.correct += 1;
    // 最終解答時刻＝最新の atMs。ログの並び順に依存しないよう max を取る
    // （Supabase 等は order 未指定だと順不同で返すため）。
    cur.dueMs = Math.max(cur.dueMs, log.atMs);
    m.set(log.topic, cur);
  }
  return m;
}

/**
 * 弱点優先度スコア（高いほど優先）。正答率が低く、due 超過が大きいほど高い（II-131）。
 *
 * ## 係数の根拠・設計意図
 *
 * | 項目                        | 係数 | 根拠                                                                 |
 * |-----------------------------|------|----------------------------------------------------------------------|
 * | (1 − 正答率) × **10**       |  10  | 誤答率を 0〜10 のレンジにスケール。スコアの主軸として最重要視する。   |
 * | 超過日数（上限30日） × **1** |   1  | 日単位で加算し「long overdue」を最大30点として補正。                  |
 * | 試行回数（上限5） × **0.1** | 0.1  | 試行数が多い=信頼性が高い分だけ軽く優先度を上げる（0〜0.5点の微調整）。|
 *
 * ### 合計スコアの範囲
 * - 最小: 0 + 0 + 0 = 0（正答率100%・due未超過・試行0）
 * - 最大: 10 + 30 + 0.5 = 40.5（正答率0%・30日超過・5回以上試行）
 *
 * ### 係数の較正方針
 * - 誤答率を最優先にするため係数10を使い overdue の最大値（30）を誤答率フル(10)の3倍に抑えた。
 *   これにより「超優秀だが放置されたカード（rate=1, overdue=30日）」のスコアは30となり、
 *   「弱点で少しだけ overdue（rate=0, overdue=5日）」のスコア15より高くなる設計。
 *   運用上は弱点かつ overdue が最高優先度になるよう両軸を組み合わせる。
 * - 係数の精密な最適化（較正テスト）は RG7 に委ねる（II-131）。
 *
 * この関数は純粋関数（副作用なし・外部依存なし）でテスト可能（II-131, II-5）。
 */
/**
 * 弱点判定の事前分布（#26/#58）。試行が少ない論点の正答率を、この合格ライン相当の
 * 事前確率へ加法平滑化で寄せる。1回だけ外した論点が、多数試行で確実に弱点の論点を
 * 上回ってしまう過大評価（ノイズ駆動）を防ぐ。
 */
export const WEAKNESS_PRIOR_RATE = 0.6; // 合格ライン相当を中立の事前正答率とする
export const WEAKNESS_PRIOR_STRENGTH = 3; // 擬似試行数（〜3問ぶんの事前情報で平滑化）

/**
 * 加法平滑化した正答率（Bayes 事後平均）。
 *   (correct + s·p0) / (attempts + s)
 * 試行0なら事前 p0、試行が増えるほど実測へ収束する。
 */
export function smoothedSuccessRate(
  correct: number,
  attempts: number,
  prior = WEAKNESS_PRIOR_RATE,
  strength = WEAKNESS_PRIOR_STRENGTH,
): number {
  const a = Math.max(0, attempts);
  const c = Math.min(Math.max(0, correct), a);
  return (c + strength * prior) / (a + strength);
}

/**
 * 試行0（学習証拠なし）の論点に適用する overdue 上限（日）。
 *
 * 通常 `aggregateByTopic` はログのある論点（attempts≥1）しか生成しないため、この経路では
 * attempts=0 は発生しない。ただし `weaknessScore` を直接（または将来別経路で）呼ぶ場合、
 * 「一度も着手していないが due だけ大きく過ぎた論点」が、実際に弱点と判明している論点より
 * 上位に来る過大評価を防ぐ。試行0では overdue 寄与を 5 日上限に抑える（attempts≥1 は従来通り 30）。
 */
export const UNTESTED_OVERDUE_CAP_DAYS = 5;

export function weaknessScore(p: TopicProgress, nowMs: number): number {
  // 異常入力（負のattempts等）でもスコアが破綻しないようクランプする（attempts は本来非負）。
  const attempts = Math.max(0, p.attempts);
  // 平滑化正答率を使う（#58）。少試行の論点は事前へ寄り、ノイズで弱点リストを占有しない。
  const rate = smoothedSuccessRate(p.correct, attempts);
  const overdueDays = Math.max(0, (nowMs - p.dueMs) / DAY_MS);
  // 試行0は学習証拠が無いため overdue 寄与を抑える（attempts≥1 の較正済み挙動は不変）。
  const overdueCap = attempts === 0 ? UNTESTED_OVERDUE_CAP_DAYS : 30;
  return (1 - rate) * 10 + Math.min(overdueDays, overdueCap) + Math.min(attempts, 5) * 0.1;
}

/**
 * 今日出すべき弱点 topic を優先度順に返す（II-133, II-142）。
 *
 * @param progress - topic 別の学習進捗（`aggregateByTopic` の結果など）。
 * @param nowMs - 現在時刻（epoch ms）。省略時は `Date.now()`。
 * @param limit - 返す最大件数（既定: 3）。引数で制御できる（II-133）。
 * @returns 優先度降順の topic 名配列（最大 `limit` 件）。
 *
 * 同 topic で連続不正解 → rate 低下 → `weaknessScore` が上昇 → 優先度が上がる。
 */
export function weakestTopics(progress: Iterable<TopicProgress>, nowMs: number = Date.now(), limit = 3): string[] {
  return [...progress]
    .map((p) => ({ topic: p.topic, score: weaknessScore(p, nowMs) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.topic);
}
