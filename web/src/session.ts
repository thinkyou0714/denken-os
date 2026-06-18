/**
 * session.ts — 学習セッションの選択補助（純ロジック）。
 *
 * state/practice.ts は localStorage/DOM に依存し node テストから import できないため、
 * インターリーブ（#50）と再出題キュー（#49）の中核ロジックをここに純関数として切り出す。
 * state/practice.ts はこれらを呼び、セッションのシングルトン状態を更新するだけにする。
 */
import type { Problem } from "../../lib/engine/schema.js";

/** 直近に出した topic を覚えておく既定件数（インターリーブの後回し判定に使う #50）。 */
export const RECENT_TOPICS_WINDOW = 3;
/** 間違えた問題を「何問あと」に再出題するかの既定値（短期の想起練習 #49）。 */
export const REQUEUE_AFTER = 3;

/** セッション内で再出題待ちの問題（短期想起練習 #49）。 */
export interface RequeueItem {
  problem: Problem;
  /** この通し番号（asked カウント）に達したら再出題する。 */
  dueAt: number;
}

/** 直近 topic 履歴に1件積んだ新しい配列を返す（新しい順・窓サイズで切る）。 */
export function pushRecentTopic(recent: readonly string[], topic: string, window = RECENT_TOPICS_WINDOW): string[] {
  return [topic, ...recent].slice(0, Math.max(0, window));
}

/**
 * 間違えた問題を再出題キューに積んだ新しいキューを返す（#49）。
 * 既に同じ問題が待機中なら二重登録しない。
 */
export function enqueueRequeue(
  queue: readonly RequeueItem[],
  problem: Problem,
  asked: number,
  after = REQUEUE_AFTER,
): RequeueItem[] {
  if (queue.some((r) => r.problem.id === problem.id)) return [...queue];
  return [...queue, { problem, dueAt: asked + after }];
}

/**
 * 再出題の期限が来た問題を1件取り出す（#49）。
 * 直近に出した問題（excludeId）は連続を避けるため後回しにする。
 * @returns 取り出した問題（無ければ null）と、取り出し後のキュー。
 */
export function takeDueRequeue(
  queue: readonly RequeueItem[],
  nowAsked: number,
  excludeId?: string,
): { problem: Problem | null; queue: RequeueItem[] } {
  const idx = queue.findIndex((r) => r.dueAt <= nowAsked && r.problem.id !== excludeId);
  if (idx < 0) return { problem: null, queue: [...queue] };
  const next = queue.slice();
  const [item] = next.splice(idx, 1);
  return { problem: item ? item.problem : null, queue: next };
}
