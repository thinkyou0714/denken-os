/**
 * select.ts — 次の出題を選ぶ純ロジック（app.ts の DOM から分離してテスト可能にする）。
 *
 * 方針: 弱点 topic を優先し、その中からランダム。直近に出した問題(excludeId)は
 *   他に候補があるかぎり避ける（同じ問題が連続して出る体験を防ぐ）。
 *
 * インターリーブ（#50）: 弱点 topic を上から順に「使い切る」のではなく、直近に出した
 *   topic を後回しにして弱点群を横断的に出す。連続して同じ topic ばかり出ると
 *   ブロック学習になり、文脈干渉による定着（interleaving 効果）が得られないため。
 */
import type { Problem } from "../../lib/engine/schema.js";

export interface PickOptions {
  /** 優先する弱点 topic（優先度順）。 */
  weakTopics: string[];
  rng?: () => number;
  /** 直近に出した問題ID（可能なら避ける）。 */
  excludeId?: string;
  /**
   * 直近に出した topic 群（新しい順）。インターリーブのため、これに含まれる弱点 topic は
   * 後回しにする（他に弱点候補があるときだけ）。
   */
  recentTopics?: string[];
}

export function pickNextProblem(problems: Problem[], opts: PickOptions): Problem | null {
  if (problems.length === 0) return null;
  const rng = opts.rng ?? Math.random;
  const recent = new Set(opts.recentTopics ?? []);

  const pickFrom = (pool: Problem[]): Problem | null => {
    if (pool.length === 0) return null;
    // 直近と同じ問題は避ける（他に候補があるときだけ）。
    const others = pool.filter((p) => p.id !== opts.excludeId);
    const usable = others.length > 0 ? others : pool;
    return usable[Math.floor(rng() * usable.length)] ?? null;
  };

  // 弱点 topic を「直近に出していないもの」優先で並べ替える（インターリーブ #50）。
  // 直近 topic を末尾へ回すことで、同じ topic を連続でドリルし続けないようにする。
  const weak = opts.weakTopics;
  const fresh = weak.filter((t) => !recent.has(t));
  const stale = weak.filter((t) => recent.has(t));
  const orderedWeak = [...fresh, ...stale];

  // 並べ替えた弱点 topic に該当する問題があればそこから（解答履歴があるとき）。
  for (const topic of orderedWeak) {
    const chosen = pickFrom(problems.filter((p) => p.topic === topic));
    if (chosen) return chosen;
  }
  // 弱点なし/該当なしは全体から。
  return pickFrom(problems);
}
