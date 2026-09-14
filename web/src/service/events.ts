import type { Problem } from "../../../lib/engine/schema.js";
import { type Attempt, attemptSchema } from "../../../lib/service/assessment.js";
import { catalogue } from "./catalog.js";
import { api } from "./client.js";
import { identity } from "./cloud-storage.js";

const key = () => (identity ? `denken:attemptQueue:${identity.id}` : null);
function pending(k = key()): Attempt[] {
  if (!k) return [];
  try {
    return attemptSchema.array().parse(JSON.parse(localStorage.getItem(k) ?? "[]"));
  } catch {
    throw new Error("保存待ちの答案を読み取れません。データ管理から書き出して確認してください。");
  }
}
let sending: Promise<void> | null = null;
let syncError = "";
function changed() {
  window.dispatchEvent(new CustomEvent("denken-attempt-sync"));
}
export function attemptSyncStatus() {
  try {
    const count = pending().length;
    return count ? syncError || `答案${count}件を${sending ? "同期中" : "保存待ち"}` : "";
  } catch (error) {
    return error instanceof Error ? error.message : "保存待ちの答案を確認してください";
  }
}
export function pendingAttemptsExport() {
  const k = key();
  return { owner: identity?.id ?? null, raw: k ? (localStorage.getItem(k) ?? "[]") : "[]" };
}
export async function flushAttempts() {
  if (sending) return sending;
  const k = key();
  const owner = identity?.id;
  if (!k || !owner) return;
  syncError = "";
  sending = (async () => {
    for (const item of pending(k)) {
      const me = await api<{ id: string }>("me");
      if (me.id !== owner || identity?.id !== owner)
        throw new Error("利用者が変わっています。前回の答案は元の利用者で同期してください。");
      await api("attempts", "POST", item, owner);
      localStorage.setItem(k, JSON.stringify(pending(k).filter((a) => a.id !== item.id)));
    }
  })();
  changed();
  try {
    await sending;
  } catch (error) {
    syncError = error instanceof Error ? error.message : "答案の保存を再試行してください";
    throw error;
  } finally {
    sending = null;
    changed();
  }
}
export async function saveAttempt(attempt: Attempt) {
  const k = key();
  if (!k) throw new Error("記録を保存するには接続を確認してください");
  const rows = pending();
  if (!rows.some((a) => a.id === attempt.id)) rows.push(attempt);
  localStorage.setItem(k, JSON.stringify(rows));
  changed();
  void flushAttempts().catch(() => {});
}
export function recordPracticeEvent(p: Problem, given: string, hints: number, startedAt: number) {
  const known = catalogue.find((item) => item.id === p.id);
  if (!known || !identity) return Promise.resolve();
  return saveAttempt({
    id: crypto.randomUUID(),
    problemId: p.id,
    revision: known.revision,
    topic: p.topic,
    skill: p.format === "descriptive" ? "論説" : "応用",
    subject: p.subject,
    family: p.topic,
    answer: given,
    correct: null,
    score: null,
    hints,
    revealed: false,
    mode: "practice",
    startedAt,
    finishedAt: Date.now(),
    cause: "不明",
    graderVersion: "service-1",
  });
}
window.addEventListener("online", () => {
  void flushAttempts().catch(() => {});
});
