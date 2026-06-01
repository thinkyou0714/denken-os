/**
 * diagnosis.ts — 弱点診断（05-adaptive-diagnosis）。
 * topic 単位の「正答率」＋「次回復習が来ているか(due)」の二層で
 * 今日やるべき弱点 topic を優先度順に返す。スケジューラ実装に依存しない。
 */

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

/** 弱点優先度スコア（高いほど優先）。正答率が低く、due 超過が大きいほど高い。 */
export function weaknessScore(p: TopicProgress, nowMs: number): number {
  const rate = p.attempts > 0 ? p.correct / p.attempts : 0;
  const overdueDays = Math.max(0, (nowMs - p.dueMs) / 86_400_000);
  // 正答率が低いほど (1-rate) が大きい。due 超過も加点。試行回数で軽く重み付け。
  return (1 - rate) * 10 + Math.min(overdueDays, 30) + Math.min(p.attempts, 5) * 0.1;
}

/**
 * 今日出すべき弱点 topic を優先度順に返す。
 * 同 topic で連続不正解 → rate 低下 → 優先度が上がる。
 */
export function weakestTopics(progress: Iterable<TopicProgress>, nowMs: number = Date.now(), limit = 3): string[] {
  return [...progress]
    .map((p) => ({ topic: p.topic, score: weaknessScore(p, nowMs) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.topic);
}
