/**
 * backup.ts — 学習データの JSON エクスポート/インポート（端末移行・バックアップ・将来の FSRS 最適化）。
 * 進捗は端末内のみで機種変更/localStorage クリアで全消失する。認証不要の JSON 入出力で消失リスクを下げる。
 * serialize / parse / merge を純関数化してテスト可能にする（UI は app.ts の薄い配線）。
 */
import type { AnswerLog } from "../../lib/scheduler/diagnosis.js";
import type { ReviewState } from "../../lib/scheduler/types.js";

export const BACKUP_VERSION = 1;

export interface Backup {
  version: number;
  reviews: Record<string, ReviewState>;
  logs: AnswerLog[];
}

export function serializeBackup(reviews: Record<string, ReviewState>, logs: AnswerLog[]): string {
  const backup: Backup = { version: BACKUP_VERSION, reviews, logs };
  return JSON.stringify(backup);
}

/** 壊れた/形状違いの JSON は null（安全に拒否）。 */
export function parseBackup(json: string): Backup | null {
  try {
    const o = JSON.parse(json) as Record<string, unknown>;
    if (!o || typeof o !== "object") return null;
    if (typeof o.version !== "number") return null;
    if (!o.reviews || typeof o.reviews !== "object") return null;
    if (!Array.isArray(o.logs)) return null;
    return { version: o.version, reviews: o.reviews as Record<string, ReviewState>, logs: o.logs as AnswerLog[] };
  } catch {
    return null;
  }
}

/**
 * 既存と取込データをマージ。logs は (topic,atMs,problemId) で重複排除して時系列、
 * reviews は topic ごとに lastReviewMs(無ければ dueMs)が新しい方を採用する。
 */
export function mergeBackup(
  existing: { reviews: Record<string, ReviewState>; logs: AnswerLog[] },
  incoming: Backup,
): { reviews: Record<string, ReviewState>; logs: AnswerLog[] } {
  const seen = new Set<string>();
  const key = (l: AnswerLog) => `${l.topic}|${l.atMs}|${l.problemId ?? ""}`;
  const logs: AnswerLog[] = [];
  for (const l of [...existing.logs, ...incoming.logs]) {
    const k = key(l);
    if (seen.has(k)) continue;
    seen.add(k);
    logs.push(l);
  }
  logs.sort((a, b) => a.atMs - b.atMs);

  const reviews: Record<string, ReviewState> = { ...existing.reviews };
  for (const [topic, rs] of Object.entries(incoming.reviews)) {
    const cur = reviews[topic];
    const newer = !cur || (rs.lastReviewMs ?? rs.dueMs) > (cur.lastReviewMs ?? cur.dueMs);
    if (newer) reviews[topic] = rs;
  }
  return { reviews, logs };
}
