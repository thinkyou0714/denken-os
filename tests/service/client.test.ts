// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  ApiError,
  allAttempts,
  api,
  download,
  records,
  saveRecord,
  setApiIdentity,
} from "../../web/src/service/client.js";

const fetcher = vi.fn<typeof fetch>();
beforeEach(() => {
  localStorage.clear();
  setApiIdentity(null);
  fetcher.mockReset();
  vi.stubGlobal("fetch", fetcher);
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

it("binds reads and writes to the identity of this tab even when another tab changes the cached account", async () => {
  setApiIdentity("tab-owner");
  localStorage.setItem("denken:lastSiteIdentity", JSON.stringify({ id: "other-tab" }));
  fetcher.mockResolvedValue(Response.json({ id: "saved", revision: 2 }));
  await saveRecord("note", "saved", { text: "my note" }, 1);
  const init = fetcher.mock.calls[0]![1]!;
  expect(new Headers(init.headers).get("x-denken-owner")).toBe("tab-owner");
  expect(JSON.parse(String(init.body))).toEqual({ id: "saved", body: { text: "my note" }, expectedRevision: 1 });
  expect(init.credentials).toBe("same-origin");
  fetcher.mockResolvedValue(Response.json({ items: [] }));
  await records("note");
  expect(new Headers(fetcher.mock.calls[1]![1]!.headers).get("x-denken-owner")).toBe("tab-owner");
  expect(localStorage.getItem("denken:readReplica:other-tab:records/note")).toBeNull();
});

it("keeps identity discovery unbound and honors the captured owner of a queued write", async () => {
  setApiIdentity("current");
  fetcher.mockImplementation(async () => Response.json({ id: "server-user" }));
  await api("me");
  expect(new Headers(fetcher.mock.calls[0]![1]!.headers).has("x-denken-owner")).toBe(false);
  await api("attempts", "POST", { id: "queued" }, "original-owner");
  expect(new Headers(fetcher.mock.calls[1]![1]!.headers).get("x-denken-owner")).toBe("original-owner");
});

it("uses only this owner's read replica when genuinely offline", async () => {
  setApiIdentity("A");
  fetcher.mockResolvedValueOnce(Response.json({ items: [{ id: "A-note" }] }));
  await records("note");
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
  fetcher.mockRejectedValue(new TypeError("offline"));
  expect(await records("note")).toEqual({ items: [{ id: "A-note" }] });
  setApiIdentity("B");
  await expect(records("note")).rejects.toThrow("offline");
  await expect(saveRecord("note", "new", {})).rejects.toThrow("offline");
});

it("never substitutes a replica for an online failure or an authorization rejection", async () => {
  setApiIdentity("A");
  localStorage.setItem("denken:readReplica:A:records/note", '{"items":[{"id":"cached"}]}');
  fetcher.mockRejectedValueOnce(new TypeError("network error"));
  await expect(records("note")).rejects.toThrow("network error");
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
  fetcher.mockResolvedValueOnce(Response.json({ error: "サインインが必要" }, { status: 401 }));
  await expect(records("note")).rejects.toMatchObject({ status: 401, message: "サインインが必要" });
});

it("reports malformed and rejected responses without treating them as a saved record", async () => {
  localStorage.setItem("denken:lastSiteIdentity", "bad json");
  fetcher.mockResolvedValueOnce(new Response("not JSON", { status: 502 }));
  await expect(api("me")).rejects.toBeInstanceOf(ApiError);
  fetcher.mockResolvedValueOnce(Response.json({}, { status: 503 }));
  await expect(api("me")).rejects.toMatchObject({ status: 503, message: "処理に失敗しました" });
});

it("keeps a successful read usable when optional replica storage is full", async () => {
  setApiIdentity("A");
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new DOMException("full");
  });
  fetcher.mockResolvedValue(Response.json({ items: [] }));
  expect(await records("note")).toEqual({ items: [] });
});

it("loads all pages, preserving the tie-breaking ID in the next cursor", async () => {
  fetcher.mockResolvedValueOnce(Response.json({ items: [{ id: "new" }], nextBefore: 200, nextId: "a/b" }));
  fetcher.mockResolvedValueOnce(Response.json({ items: [{ id: "old" }], nextBefore: null, nextId: null }));
  expect(await allAttempts()).toEqual({ items: [{ id: "new" }, { id: "old" }] });
  expect(fetcher.mock.calls[1]![0]).toBe("/api/attempts?before=200&beforeId=a%2Fb");
  fetcher.mockImplementation(async () => Response.json({ items: [], nextBefore: 1, nextId: "unchanged" }));
  await expect(allAttempts()).rejects.toThrow("集計上限");
});

it("exports a complete file and releases its temporary object URL", () => {
  vi.useFakeTimers();
  const create = vi.fn(() => "blob:download"),
    revoke = vi.fn();
  vi.stubGlobal("URL", Object.assign(class extends URL {}, { createObjectURL: create, revokeObjectURL: revoke }));
  const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
    expect(this.download).toBe("notes.json");
    expect(this.href).toBe("blob:download");
  });
  download("notes.json", '{"notes":[]}');
  expect(create.mock.calls).toHaveLength(1);
  expect(click).toHaveBeenCalledOnce();
  vi.advanceTimersByTime(1000);
  expect(revoke).toHaveBeenCalledWith("blob:download");
});
