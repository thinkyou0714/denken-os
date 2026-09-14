// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";

let cloud: typeof import("../../web/src/service/cloud-storage.js");
let owner: string;
let data: Record<string, string>;
let revision: number;
let posts: { data: Record<string, string>; expected: number; owner: string | null }[];
let offline: boolean;
let conflict: Record<string, string> | null;
let afterSave: (() => void) | null;
const fetcher = vi.fn<typeof fetch>();
let listeners: ReturnType<typeof vi.spyOn>;
beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers();
  localStorage.clear();
  owner = "A";
  data = { "denken:existing": "initial" };
  revision = 1;
  posts = [];
  offline = false;
  conflict = null;
  afterSave = null;
  fetcher.mockReset().mockImplementation(async (url, init) => {
    if (offline) throw new TypeError("offline");
    if (String(url) === "/api/me") return Response.json({ id: owner, role: "owner" });
    if (init?.method === "GET")
      return Response.json({ items: revision ? [{ id: "current", revision, body: { data } }] : [] });
    const sent = JSON.parse(String(init?.body));
    posts.push({
      data: sent.body.data,
      expected: sent.expectedRevision,
      owner: new Headers(init?.headers).get("x-denken-owner"),
    });
    if (conflict) {
      data = conflict;
      conflict = null;
      revision++;
      return Response.json({ error: "conflict" }, { status: 409 });
    }
    data = sent.body.data;
    revision++;
    afterSave?.();
    afterSave = null;
    return Response.json({ id: "current", revision });
  });
  vi.stubGlobal("fetch", fetcher);
  vi.spyOn(navigator, "onLine", "get").mockImplementation(() => !offline);
  listeners = vi.spyOn(window, "addEventListener");
  cloud = await import("../../web/src/service/cloud-storage.js");
});
afterEach(() => {
  for (const [name, listener] of listeners.mock.calls)
    window.removeEventListener(name as string, listener as EventListener);
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
const saved = () => JSON.parse(localStorage.getItem("denken:pending:A") ?? "{}");

it("implements Storage, keeps device preferences local, and persists deletions with the expected owner", async () => {
  await cloud.cloudStorage.initialize();
  const s = cloud.cloudStorage;
  expect(s.length).toBe(1);
  expect(s.key(0)).toBe("denken:existing");
  expect(s.key(99)).toBeNull();
  expect(s.getItem("missing")).toBeNull();
  s.setItem("denken:theme", "dark");
  expect(s.getItem("denken:theme")).toBe("dark");
  s.removeItem("denken:theme");
  expect(s.getItem("denken:theme")).toBeNull();
  expect(() => s.setItem("foreign:key", "no")).toThrow();
  expect(() => s.setItem("denken:secret", "no")).toThrow();
  s.setItem("denken:new", "value");
  s.removeItem("denken:existing");
  expect(saved().pending).toEqual({ "denken:new": "value", "denken:existing": null });
  await s.flush();
  expect(posts).toEqual([{ data: { "denken:new": "value" }, expected: 1, owner: "A" }]);
  expect(cloud.syncStatus).toBe("同期済み");
  s.clear();
  await s.flush();
  expect(data).toEqual({});
  s.reset();
  expect(s.length).toBe(0);
  expect(localStorage.getItem("denken:pending:A")).toBeNull();
});

it("automatically sends a changed preference and preserves a later edit made during the first save", async () => {
  await cloud.cloudStorage.initialize();
  cloud.cloudStorage.setItem("denken:goal", "first");
  afterSave = () => cloud.cloudStorage.setItem("denken:goal", "latest");
  await vi.advanceTimersByTimeAsync(500);
  expect(posts.map((p) => p.data["denken:goal"])).toEqual(["first", "latest"]);
  expect(cloud.cloudStorage.getItem("denken:goal")).toBe("latest");
  expect(saved().pending).toEqual({});
});

it("coalesces simultaneous flushes without duplicate writes", async () => {
  await cloud.cloudStorage.initialize();
  cloud.cloudStorage.setItem("denken:goal", "new");
  await Promise.all([cloud.cloudStorage.flush(), cloud.cloudStorage.flush()]);
  expect(posts).toHaveLength(1);
});

it("merges unrelated remote edits after a revision conflict", async () => {
  await cloud.cloudStorage.initialize();
  cloud.cloudStorage.setItem("denken:goal", "mine");
  cloud.cloudStorage.removeItem("denken:existing");
  conflict = { "denken:existing": "initial", "denken:remote": "theirs" };
  await cloud.cloudStorage.flush();
  expect(data).toEqual({ "denken:goal": "mine", "denken:remote": "theirs" });
  expect(posts.map((p) => p.expected)).toEqual([1, 2]);
});

it("keeps conflicting work exportable and does not overwrite the other device", async () => {
  await cloud.cloudStorage.initialize();
  cloud.cloudStorage.setItem("denken:existing", "mine");
  conflict = { "denken:existing": "theirs" };
  await expect(cloud.cloudStorage.flush()).rejects.toThrow("競合");
  expect(posts).toHaveLength(1);
  expect(data["denken:existing"]).toBe("theirs");
  expect(cloud.cloudStorage.pendingExport()).toMatchObject({ pending: { "denken:existing": "mine" } });
});

it("retains an offline queue and sends it on reconnection", async () => {
  await cloud.cloudStorage.initialize();
  offline = true;
  cloud.cloudStorage.setItem("denken:goal", "offline work");
  await expect(cloud.cloudStorage.flush()).rejects.toThrow("offline");
  expect(saved().pending["denken:goal"]).toBe("offline work");
  await cloud.cloudStorage.initialize();
  expect(cloud.syncStatus).toContain("オフライン");
  expect(cloud.cloudStorage.getItem("denken:goal")).toBe("offline work");
  offline = false;
  window.dispatchEvent(new Event("online"));
  await vi.waitFor(() => expect(data["denken:goal"]).toBe("offline work"));
});

it("does not restore cached authorization after a received rejection, even if the device reports offline", async () => {
  await cloud.cloudStorage.initialize();
  offline = true;
  fetcher.mockImplementation(async () => Response.json({ error: "blocked" }, { status: 401 }));
  await expect(cloud.cloudStorage.initialize()).rejects.toMatchObject({ status: 401 });
  expect(cloud.identity).toBeNull();
  expect(cloud.syncStatus).toBe("サインインが必要");
});

it("cannot send an old account's pending values after the signed-in user changes", async () => {
  await cloud.cloudStorage.initialize();
  cloud.cloudStorage.setItem("denken:goal", "A's draft");
  owner = "B";
  await expect(cloud.cloudStorage.flush()).rejects.toThrow("利用者が変わっています");
  expect(posts).toHaveLength(0);
  data = {};
  revision = 0;
  await cloud.cloudStorage.initialize();
  expect(cloud.identity?.id).toBe("B");
  expect(cloud.cloudStorage.getItem("denken:goal")).toBeNull();
  expect(saved().pending).toEqual({ "denken:goal": "A's draft" });
  cloud.cloudStorage.setItem("denken:b", "B's work");
  await cloud.cloudStorage.flush();
  expect(posts[0]).toEqual({ data: { "denken:b": "B's work" }, expected: 0, owner: "B" });
});

it("restores the original revision and queued deletions before reconnecting", async () => {
  localStorage.setItem(
    "denken:pending:A",
    JSON.stringify({
      base: { "denken:existing": "initial" },
      revision: 1,
      pending: { "denken:existing": null, "denken:new": "restored" },
    }),
  );
  await cloud.cloudStorage.initialize();
  await cloud.cloudStorage.flush();
  expect(data).toEqual({ "denken:new": "restored" });
  expect(posts[0]?.expected).toBe(1);
});

it("reports initialization failure and leaves the durable queue intact", async () => {
  localStorage.setItem("denken:pending:A", "unreadable raw queue");
  await expect(cloud.cloudStorage.initialize()).rejects.toThrow();
  expect(localStorage.getItem("denken:pending:A")).toBe("unreadable raw queue");
  expect(cloud.syncStatus).toContain("接続待ち");
  await cloud.cloudStorage.flush();
  expect(posts).toHaveLength(0);
  await expect(cloud.cloudStorage.initialize()).rejects.toThrow();
  expect(localStorage.getItem("denken:pending:A")).toBe("unreadable raw queue");
});

it("does not retain the previous user's data when the next user's initial read fails", async () => {
  await cloud.cloudStorage.initialize();
  cloud.cloudStorage.setItem("denken:goal", "A's draft");
  owner = "B";
  fetcher.mockImplementation(async (url) =>
    String(url) === "/api/me"
      ? Response.json({ id: owner, role: "student" })
      : Response.json({ error: "temporarily unavailable" }, { status: 503 }),
  );
  await expect(cloud.cloudStorage.initialize()).rejects.toMatchObject({ status: 503 });
  expect(cloud.identity).toBeNull();
  expect(cloud.cloudStorage.getItem("denken:goal")).toBeNull();
  await expect(cloud.cloudStorage.initialize()).rejects.toMatchObject({ status: 503 });
  expect(localStorage.getItem("denken:pending:B")).toBeNull();
  expect(saved().pending["denken:goal"]).toBe("A's draft");
  expect(posts).toHaveLength(0);
});
