import { afterEach, beforeEach, expect, it } from "vitest";
import { digest } from "../../site/db.js";
import type { Env } from "../../site/environment.js";
import worker from "../../site/worker.js";
import { testDatabase } from "./database.js";

let db: ReturnType<typeof testDatabase>;
let env: Env;
const call = (headers: Record<string, string>, path = "me", extras?: Partial<Env>) =>
  worker.fetch(new Request(`https://example.test/api/${path}`, { headers }), { ...env, ...extras });
beforeEach(async () => {
  db = testDatabase();
  env = {
    DB: db.binding,
    DENKEN_OWNER_FALLBACK_ID: "existing-owner",
    DENKEN_OWNER_FALLBACK_EMAIL_SHA256: await digest("owner@example.test"),
  };
  await call({ "oai-authenticated-user-id": "existing-owner" });
});
afterEach(() => db.close());

it("recognizes only the pinned existing owner when dispatch forwards email without ID", async () => {
  await db.binding
    .prepare("INSERT INTO records VALUES(?,?,?,?,?,?,0)")
    .bind("existing-owner", "note", "saved", '{"text":"以前の学習"}', 1, 123)
    .run();
  const headers = { "oai-authenticated-user-email": "Owner@Example.Test" };
  expect(await (await call(headers)).json()).toMatchObject({
    id: "existing-owner",
    role: "owner",
    authentication: "owner-compatibility",
  });
  expect(await (await call(headers, "records/note")).json()).toMatchObject({
    items: [{ id: "saved", body: { text: "以前の学習" } }],
  });
});

it("does not accept an arbitrary email, display name, query owner, or missing pin", async () => {
  expect((await call({ "oai-authenticated-user-email": "other@example.test" })).status).toBe(401);
  expect((await call({ "oai-authenticated-user-full-name": "owner@example.test" })).status).toBe(401);
  expect((await call({}, "me?owner=existing-owner")).status).toBe(401);
  expect(
    (
      await call({ "oai-authenticated-user-email": "owner@example.test" }, "me", {
        DENKEN_OWNER_FALLBACK_EMAIL_SHA256: "",
      })
    ).status,
  ).toBe(401);
});

it("gives a supplied stable ID precedence over the compatibility email", async () => {
  const response = await call({
    "oai-authenticated-user-id": "student",
    "oai-authenticated-user-email": "owner@example.test",
  });
  expect(await response.json()).toMatchObject({ id: "student", role: "student", authentication: "platform-id" });
  expect((await call({ "oai-authenticated-user-id": "student" }, "admin/overview")).status).toBe(403);
});

it("rejects requests authored for another account even if that account changed between requests", async () => {
  const headers = { "oai-authenticated-user-id": "student", "x-denken-owner": "existing-owner" };
  expect((await call(headers, "records/note")).status).toBe(409);
  const response = await worker.fetch(
    new Request("https://example.test/api/records/note", {
      method: "POST",
      headers: { ...headers, "content-type": "application/json" },
      body: JSON.stringify({ id: "foreign", expectedRevision: 0, body: { text: "other account's note" } }),
    }),
    env,
  );
  expect(response.status).toBe(409);
  expect(await db.binding.prepare("SELECT COUNT(*) AS n FROM records").first()).toEqual({ n: 0 });
});

it("cannot create an owner through the compatibility path or reactivate a suspended account", async () => {
  const headers = { "oai-authenticated-user-email": "owner@example.test" };
  expect((await call(headers, "me", { DENKEN_OWNER_FALLBACK_ID: "unregistered" })).status).toBe(401);
  await db.binding.prepare("UPDATE members SET status='suspended' WHERE id=?").bind("existing-owner").run();
  expect((await call(headers)).status).toBe(401);
  expect((await call({ "oai-authenticated-user-id": "existing-owner" })).status).toBe(403);
});

it("checks the actual database before reporting healthy and serves the existing favicon", async () => {
  expect(await (await call({}, "health")).json()).toMatchObject({ ok: true, database: "ready" });
  expect((await worker.fetch(new Request("https://example.test/api/health"), {} as Env)).status).toBe(503);
  const icon = await worker.fetch(new Request("https://example.test/favicon.ico"), env);
  expect(icon.status).toBe(302);
  expect(icon.headers.get("location")).toBe("https://example.test/icon.svg");
});
