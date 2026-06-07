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
  /** 任意: どの問題に対する解答か（問題単位の集計・誤答分析の素地）。 */
  problemId?: string;
}

/**
 * 解答ログから topic 別の集計を作る。
 * dueMs は本来「次回復習予定」だが、ログだけでは最終解答時刻しか分からない。
 * スケジューラの実 due(dueByTopic)が渡されたらそれで上書きし、recency と due の混同を解消する
 * （SCHED-2: 実 due 無しの素朴値だと『最近やった＝過去の atMs』で overdue が逆転していた）。
 */
export function aggregateByTopic(
  logs: AnswerLog[],
  dueByTopic?: ReadonlyMap<string, number>,
): Map<string, TopicProgress> {
  const m = new Map<string, TopicProgress>();
  for (const log of logs) {
    const cur = m.get(log.topic) ?? { topic: log.topic, attempts: 0, correct: 0, dueMs: log.atMs };
    cur.attempts += 1;
    if (log.correct) cur.correct += 1;
    // 既定は最終解答時刻＝最新の atMs。ログの並び順に依存しないよう max を取る
    // （Supabase 等は order 未指定だと順不同で返すため）。
    cur.dueMs = Math.max(cur.dueMs, log.atMs);
    m.set(log.topic, cur);
  }
  // スケジューラの実 due が分かる topic は、その「次回復習予定」で上書きする。
  if (dueByTopic) {
    for (const cur of m.values()) {
      const due = dueByTopic.get(cur.topic);
      if (due !== undefined) cur.dueMs = due;
    }
  }
  return m;
}

/**
 * 正答率の Wilson 下側信頼区間（D2）。試行が少ないほど中央へ縮約し、1/1 を rate=1.0 と
 * 即断して得意扱いする少サンプル過信を防ぐ。0(試行なし)〜1。
 */
export function wilsonLowerBound(correct: number, n: number, z = 1.96): number {
  if (n <= 0) return 0;
  const p = correct / n;
  const denom = 1 + (z * z) / n;
  const center = p + (z * z) / (2 * n);
  const margin = z * Math.sqrt((p * (1 - p) + (z * z) / (4 * n)) / n);
  return Math.max(0, (center - margin) / denom);
}

/**
 * 弱点優先度スコア（高いほど優先）。確信度が低く、予定からの超過が大きいほど高い。
 * dueMs が実スケジュールなら overdue=予定超過日数（未来=未到来なら 0）。
 * 実 due が無い topic は recency(最終解答時刻)へフォールバックする。
 */
export function weaknessScore(p: TopicProgress, nowMs: number): number {
  // Wilson 下側で「まだ得意と断定しない」挙動にする（D2）。
  const confidence = wilsonLowerBound(p.correct, p.attempts);
  const overdueDays = Math.max(0, (nowMs - p.dueMs) / 86_400_000);
  // 試行が少ない=不確実な topic に小ボーナス（D1: 旧『試行が多いほど加点』は弱点優先と逆で誤りだった）。
  const uncertainty = p.attempts < 3 ? (3 - p.attempts) * 0.3 : 0;
  return (1 - confidence) * 10 + Math.min(overdueDays, 30) + uncertainty;
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
