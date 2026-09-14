import type { Problem } from "../../../lib/engine/schema.js";
import type { Attempt } from "../../../lib/service/assessment.js";
import { catalogue } from "./catalog.js";
import { api } from "./client.js";
import { identity } from "./cloud-storage.js";

const key = () => (identity ? `denken:attemptQueue:${identity.id}` : null);
function pending(): Attempt[] {
  const k = key();
  if (!k) return [];
  try {
    return JSON.parse(localStorage.getItem(k) ?? "[]");
  } catch {
    return [];
  }
}
let sending: Promise<void> | null = null;
export async function flushAttempts() {
  if (sending) return sending;
  const k = key();
  if (!k) return;
  sending = (async () => {
    for (const item of pending()) {
      const me = await api<{ id: string }>("me");
      if (me.id !== identity?.id) throw new Error("利用者が変わっています。前回の答案は元の利用者で同期してください。");
      await api("attempts", "POST", item);
      localStorage.setItem(k, JSON.stringify(pending().filter((a) => a.id !== item.id)));
    }
  })();
  try {
    await sending;
  } finally {
    sending = null;
  }
}
export async function saveAttempt(attempt: Attempt) {
  const k = key();
  if (!k) throw new Error("記録を保存するには接続を確認してください");
  const rows = pending();
  if (!rows.some((a) => a.id === attempt.id)) rows.push(attempt);
  localStorage.setItem(k, JSON.stringify(rows));
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
