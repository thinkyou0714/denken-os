import { afterEach, beforeEach, describe, expect, it } from "vitest";
import worker from "../../site/worker.js";
import catalog from "../../web/service/catalog.json";
import { testDatabase } from "./database.js";

let database: ReturnType<typeof testDatabase>;
beforeEach(() => {
  database = testDatabase();
});
afterEach(() => database.close());
function request(path: string, owner = "owner", method = "GET", body?: unknown, extra?: Record<string, string>) {
  const headers: Record<string, string> = { "content-type": "application/json", ...extra };
  if (owner) headers["oai-authenticated-user-id"] = owner;
  return worker.fetch(
    new Request(`https://example.test/api/${path}`, {
      method,
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }),
    { DB: database.binding },
  );
}
describe("authenticated study service with actual SQLite", () => {
  it("requires identity, rejects cross-origin writes and prevents privilege escalation", async () => {
    expect((await request("me", "")).status).toBe(401);
    expect(await (await request("me")).json()).toMatchObject({ role: "owner" });
    expect(await (await request("me", "student")).json()).toMatchObject({ role: "student" });
    expect((await request("admin/overview", "student")).status).toBe(403);
    expect((await request("records/note", "owner", "POST", {}, { origin: "https://attacker.test" })).status).toBe(403);
    expect(
      (
        await request("records/entitlement", "student", "POST", {
          id: "student",
          expectedRevision: 0,
          body: { status: "active" },
        })
      ).status,
    ).toBe(403);
  });
  it("isolates users and uses compare-and-swap revisions without overwriting", async () => {
    await request("me");
    const row = { id: "note", expectedRevision: 0, body: { text: "original" } };
    expect((await request("records/note", "owner", "POST", row)).status).toBe(201);
    expect((await request("records/note", "owner", "POST", { ...row, body: { text: "overwrite" } })).status).toBe(409);
    expect(await (await request("records/note", "student")).json()).toEqual({ items: [] });
    expect(await (await request("records/note")).json()).toMatchObject({
      items: [{ body: { text: "original" }, revision: 1 }],
    });
    expect(
      (
        await request("records/legacy", "owner", "POST", {
          id: "current",
          expectedRevision: 0,
          body: { data: { "denken:apiKey": "secret" } },
        })
      ).status,
    ).toBe(400);
  });
  it("recalculates grades and makes repeated deliveries idempotent", async () => {
    const p = catalog.find((p) => p.format === "multiple_choice");
    expect(p).toBeDefined();
    const attempt = {
      id: "event",
      problemId: p!.id,
      revision: p!.revision,
      family: p!.family,
      topic: p!.topic,
      skill: "計算",
      subject: p!.subject,
      answer: "wrong",
      correct: true,
      score: 1,
      hints: 0,
      revealed: false,
      mode: "practice",
      startedAt: 100,
      finishedAt: 200,
    };
    expect(await (await request("attempts", "owner", "POST", attempt)).json()).toMatchObject({
      attempt: { correct: false, score: 0 },
      duplicate: false,
    });
    expect(await (await request("attempts", "owner", "POST", attempt)).json()).toMatchObject({ duplicate: true });
    expect((await request("attempts", "owner", "POST", { ...attempt, answer: p!.answer })).status).toBe(409);
    expect(await (await request("attempts", "student")).json()).toMatchObject({ items: [] });
  });
  it("grades only the server-saved exam and rejects edits after submission", async () => {
    const start = (await (
      await request("exam/start", "owner", "POST", { paperId: "denken2-2026-theory", mode: "practice" })
    ).json()) as { id: string; body: object };
    expect(
      (
        await request("records/exam", "owner", "POST", {
          id: start.id,
          expectedRevision: 1,
          body: { answers: { q1_1: "カ" }, selected: ["q7"], flagged: ["q1"] },
        })
      ).status,
    ).toBe(201);
    expect(await (await request("records/exam", "owner")).json()).toMatchObject({
      items: [{ body: { flagged: ["q1"] } }],
    });
    const input = {
      paperId: "denken2-2026-theory",
      revision: "official-20260830-v1",
      sessionId: start.id,
      answers: { q1_2: "リ" },
      selected: ["q7"],
    };
    const graded = await (await request("exam/grade", "owner", "POST", input)).json();
    expect(graded).toMatchObject({ result: { earned: 3, possible: 90 } });
    expect(await (await request("exam/grade", "owner", "POST", input)).json()).toMatchObject({ result: { earned: 3 } });
    expect(
      (
        await request("records/exam", "owner", "POST", {
          id: start.id,
          expectedRevision: 3,
          body: { answers: {}, selected: [] },
        })
      ).status,
    ).toBe(409);
    expect((await request("exam/grade", "student", "POST", input)).status).toBe(404);
  });
  it("restores notes into a different account without transferring privileges or duplicating records", async () => {
    await request("records/note", "owner", "POST", { id: "portable", expectedRevision: 0, body: { text: "my note" } });
    const backup = await (await request("export")).json();
    expect(await (await request("import", "new-account", "POST", backup)).json()).toMatchObject({
      imported: 1,
      conflicts: [],
    });
    expect(await (await request("import", "new-account", "POST", backup)).json()).toMatchObject({
      imported: 0,
      conflicts: [],
    });
    expect(await (await request("records/note", "new-account")).json()).toMatchObject({
      items: [{ body: { text: "my note" } }],
    });
    await request("account", "owner", "DELETE", { confirm: "学習記録を削除" });
    expect(await (await request("me", "third-account")).json()).toMatchObject({ role: "student" });
  });
  it("keeps unknown questions and unverified AI responses on hold", async () => {
    expect(
      await (
        await request("tutor", "owner", "POST", { question: "不明な問題を答えて", problemId: "unknown", reveal: true })
      ).json(),
    ).toMatchObject({ held: true });
    expect(await (await request("tutor", "owner", "POST", { question: "計算: 12*12" })).json()).toMatchObject({
      answer: "144",
      held: false,
    });
    const p = catalog[0]!;
    expect(
      await (
        await request("tutor", "owner", "POST", {
          question: "説明して",
          problemId: p.id,
          revision: p.revision,
          reveal: true,
        })
      ).json(),
    ).toMatchObject({ mode: "verified-explanation", answer: p.solution.join("\n") });
  });
  it("requires human evidence and valid machine checks before publishing a new version", async () => {
    const p = catalog[0]!;
    const draft = (await (
      await request("content", "owner", "POST", {
        ...p,
        id: "candidate",
        status: "draft",
        validation: { ...p.validation, solver_checked: false },
      })
    ).json()) as { problem: { id: string; revision: string } };
    expect(draft.problem).toBeDefined();
    const review = {
      target: draft.problem.id,
      fingerprint: draft.problem.revision,
      decision: "approve",
      reason: "各確認結果を確認した記録です",
      humanConfirmed: true,
      cases: [
        { name: "representative", result: "ok" },
        { name: "boundary", result: "ok" },
        { name: "counterexample", result: "ok" },
      ],
    };
    expect((await request("reviews", "owner", "POST", review)).status).toBe(422);
    expect((await request("reviews", "student", "POST", review)).status).toBe(403);
    const live = (await (await request("catalog")).json()) as { problems: { id: string }[] };
    expect(live.problems.some((p) => p.id === "candidate")).toBe(false);
  });
});
