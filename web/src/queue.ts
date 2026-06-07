/**
 * queue.ts — 本日の復習キュー集計（純ロジック）。
 * scheduler の dueMs を射影し「あと何件 due / 超過 / 次はいつ」をセッションのゴールとして見せる
 * （目標勾配効果で継続を促す。永続化追加なし＝既存 state の射影のみ）。
 */
import type { ReviewState } from "../../lib/scheduler/types.js";

export interface DueSummary {
  /** 今 due に到達している件数。 */
  dueNow: number;
  /** 予定を1日以上超過している件数。 */
  overdue: number;
  /** 次に due になる時刻（未来）。無ければ null。 */
  nextDueMs: number | null;
}

const DAY_MS = 86_400_000;

export function dueSummary(reviews: Map<string, ReviewState>, nowMs: number = Date.now()): DueSummary {
  let dueNow = 0;
  let overdue = 0;
  let nextDueMs: number | null = null;
  for (const s of reviews.values()) {
    if (s.dueMs <= nowMs) {
      dueNow += 1;
      if (nowMs - s.dueMs >= DAY_MS) overdue += 1;
    } else if (nextDueMs === null || s.dueMs < nextDueMs) {
      nextDueMs = s.dueMs;
    }
  }
  return { dueNow, overdue, nextDueMs };
}
