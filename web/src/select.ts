/**
 * select.ts — 次の出題を選ぶ純ロジック（app.ts の DOM から分離してテスト可能にする）。
 *
 * 方針: 弱点 topic を優先し、その中からランダム。直近に出した問題(excludeId)は
 *   他に候補があるかぎり避ける（同じ問題が連続して出る体験を防ぐ）。
 */
import type { Problem } from "../../lib/engine/schema.js";

export interface PickOptions {
  /** 優先する弱点 topic（優先度順）。 */
  weakTopics: string[];
  rng?: () => number;
  /** 直近に出した問題ID（可能なら避ける）。 */
  excludeId?: string;
  /** 直近に出した topic 列（末尾が最新）。interleaving の連続抑制に使う。 */
  recentTopics?: string[];
  /** 同一 topic の最大連続数（既定2）。これ以上連続している topic は後回し。 */
  maxSameTopicRun?: number;
  /** 再出題予定が到来した問題ID（問題単位 relearning）。最優先で再出題する。 */
  lapsedDueIds?: string[];
}

export function pickNextProblem(problems: Problem[], opts: PickOptions): Problem | null {
  if (problems.length === 0) return null;
  const rng = opts.rng ?? Math.random;
  const recent = opts.recentTopics ?? [];
  const maxRun = opts.maxSameTopicRun ?? 2;

  // 末尾(最新)から同 topic が何連続しているか。
  const trailingRun = (topic: string): number => {
    let n = 0;
    for (let i = recent.length - 1; i >= 0 && recent[i] === topic; i--) n += 1;
    return n;
  };

  const pickFrom = (pool: Problem[]): Problem | null => {
    if (pool.length === 0) return null;
    // 直近と同じ問題は避ける（他に候補があるときだけ）。
    const others = pool.filter((p) => p.id !== opts.excludeId);
    const usable = others.length > 0 ? others : pool;
    return usable[Math.floor(rng() * usable.length)] ?? null;
  };

  // Relearning 最優先: 再出題予定が到来した「外した問題」があれば再出題（problem 単位 spaced retrieval）。
  const lapsed = new Set((opts.lapsedDueIds ?? []).filter((id) => id !== opts.excludeId));
  if (lapsed.size > 0) {
    const chosen = pickFrom(problems.filter((p) => lapsed.has(p.id)));
    if (chosen) return chosen;
  }

  // Interleaving: 連続上限に達していない弱点を優先し、達したものは後回し（転移と長期保持を上げる）。
  // 候補が当該 topic しか無ければ妥協して出す（出題継続を優先）。
  const fresh = opts.weakTopics.filter((t) => trailingRun(t) < maxRun);
  const stale = opts.weakTopics.filter((t) => trailingRun(t) >= maxRun);
  for (const topic of [...fresh, ...stale]) {
    const chosen = pickFrom(problems.filter((p) => p.topic === topic));
    if (chosen) return chosen;
  }
  // 弱点なし/該当なしは全体から。
  return pickFrom(problems);
}
