// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { problemSchema } from "../../lib/engine/schema.js";
import type { Attempt } from "../../lib/service/assessment.js";
import catalogue from "../../web/service/catalog.json";

const state = vi.hoisted(() => ({ identity: { id: "A" } as { id: string } | null, api: vi.fn() }));
vi.mock("../../web/src/service/client.js", () => ({ api: state.api }));
vi.mock("../../web/src/service/cloud-storage.js", () => ({
  get identity() {
    return state.identity;
  },
}));
vi.mock("../../web/src/service/catalog.js", () => ({ catalogue }));
let events: typeof import("../../web/src/service/events.js");
let listener: ReturnType<typeof vi.spyOn>;
const attempt = (id = "one"): Attempt => ({
  id,
  problemId: catalogue[0]!.id,
  revision: catalogue[0]!.revision,
  family: catalogue[0]!.topic,
  topic: catalogue[0]!.topic,
  subject: catalogue[0]!.subject,
  skill: "応用",
  answer: "10",
  correct: null,
  score: null,
  hints: 0,
  revealed: false,
  mode: "practice",
  startedAt: 1,
  finishedAt: 2,
  cause: "不明",
  graderVersion: "service-1",
});
beforeEach(async () => {
  vi.resetModules();
  localStorage.clear();
  state.identity = { id: "A" };
  state.api.mockReset().mockImplementation(async (path: string) => (path === "me" ? { id: "A" } : {}));
  listener = vi.spyOn(window, "addEventListener");
  events = await import("../../web/src/service/events.js");
});
afterEach(() => {
  for (const [name, fn] of listener.mock.calls) window.removeEventListener(name as string, fn as EventListener);
  vi.restoreAllMocks();
});

it("sends each queued answer once, retains the captured owner and empties only that owner's queue", async () => {
  localStorage.setItem("denken:attemptQueue:A", JSON.stringify([attempt(), attempt("two")]));
  localStorage.setItem("denken:attemptQueue:B", JSON.stringify([attempt("B-answer")]));
  expect(events.attemptSyncStatus()).toContain("2件");
  await Promise.all([events.flushAttempts(), events.flushAttempts()]);
  expect(state.api.mock.calls.filter((c) => c[0] === "attempts").map((c) => [c[2].id, c[3]])).toEqual([
    ["one", "A"],
    ["two", "A"],
  ]);
  expect(JSON.parse(localStorage.getItem("denken:attemptQueue:A")!)).toEqual([]);
  expect(JSON.parse(localStorage.getItem("denken:attemptQueue:B")!)[0].id).toBe("B-answer");
  expect(events.attemptSyncStatus()).toBe("");
});

it("retains failed submissions, exposes their status and retries after reconnection", async () => {
  state.api.mockRejectedValue(new Error("接続待ち"));
  await events.saveAttempt(attempt());
  await expect(events.flushAttempts()).rejects.toThrow("接続待ち");
  expect(events.attemptSyncStatus()).toContain("接続待ち");
  expect(JSON.parse(events.pendingAttemptsExport().raw)).toHaveLength(1);
  await events.saveAttempt(attempt());
  await expect(events.flushAttempts()).rejects.toThrow();
  expect(JSON.parse(events.pendingAttemptsExport().raw)).toHaveLength(1);
  state.api.mockImplementation(async (path: string) => (path === "me" ? { id: "A" } : {}));
  window.dispatchEvent(new Event("online"));
  await vi.waitFor(() => expect(events.attemptSyncStatus()).toBe(""));
});

it("refuses to transfer an old answer when identity changes while checking the session", async () => {
  localStorage.setItem("denken:attemptQueue:A", JSON.stringify([attempt()]));
  state.api.mockImplementation(async () => {
    state.identity = { id: "B" };
    return { id: "B" };
  });
  await expect(events.flushAttempts()).rejects.toThrow("利用者が変わっています");
  expect(state.api.mock.calls.some((c) => c[0] === "attempts")).toBe(false);
  expect(JSON.parse(localStorage.getItem("denken:attemptQueue:A")!)).toHaveLength(1);
});

it("does not replace a damaged queue and exports its original bytes for recovery", async () => {
  const damaged = '{"not":"an array"}';
  localStorage.setItem("denken:attemptQueue:A", damaged);
  await expect(events.saveAttempt(attempt())).rejects.toThrow("読み取れません");
  expect(events.attemptSyncStatus()).toContain("書き出して");
  expect(events.pendingAttemptsExport()).toEqual({ owner: "A", raw: damaged });
});

it("records known legacy exercises with their fixed catalogue revision and ignores unknown or signed-out attempts", async () => {
  const p = problemSchema.parse(catalogue[0]);
  await events.recordPracticeEvent(p, "10", 1, 1);
  await events.flushAttempts();
  const sent = state.api.mock.calls.find((c) => c[0] === "attempts")![2];
  expect(sent).toMatchObject({
    problemId: p.id,
    revision: catalogue[0]!.revision,
    answer: "10",
    hints: 1,
    graderVersion: "service-1",
  });
  state.api.mockClear();
  await events.recordPracticeEvent({ ...p, id: "unknown" }, "10", 0, 1);
  state.identity = null;
  await events.recordPracticeEvent(p, "10", 0, 1);
  await expect(events.saveAttempt(attempt())).rejects.toThrow("接続を確認");
  await events.flushAttempts();
  expect(state.api).not.toHaveBeenCalled();
  expect(events.pendingAttemptsExport()).toEqual({ owner: null, raw: "[]" });
});
