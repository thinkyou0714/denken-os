// @vitest-environment jsdom
import { createHash, webcrypto } from "node:crypto";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import fixture from "../../web/service/catalog.json";

const state = vi.hoisted(() => ({ isSite: false, api: vi.fn() }));
vi.mock("../../web/src/service/platform.js", () => ({
  get isSite() {
    return state.isSite;
  },
}));
vi.mock("../../web/src/service/client.js", () => ({ api: state.api }));
let catalog: typeof import("../../web/src/service/catalog.js");
let payload: unknown;
let manifest: {
  catalog: { file: string; count: number; sha256: string };
  experimental: { total: number; shards: { file: string; subject: string; count: number; sha256: string }[] };
};
let assetStatus: number;
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const refreshHash = () => {
  manifest.catalog.sha256 = hash(payload);
};
beforeEach(async () => {
  vi.resetModules();
  state.isSite = false;
  state.api.mockReset();
  assetStatus = 200;
  payload = [structuredClone(fixture[0])];
  manifest = {
    catalog: { file: "catalog.json", count: 1, sha256: hash(payload) },
    experimental: { total: 1, shards: [{ file: "power.json", subject: "電力", count: 1, sha256: hash(payload) }] },
  };
  vi.stubGlobal("crypto", webcrypto);
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: unknown) =>
      String(url).includes("manifest.json")
        ? Response.json(manifest)
        : new Response(JSON.stringify(payload), { status: assetStatus }),
    ),
  );
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
  catalog = await import("../../web/src/service/catalog.js");
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("verifies bytes and count before publishing the reviewed catalogue, then loads a separate experimental shard", async () => {
  expect(await catalog.loadServiceProblems()).toHaveLength(1);
  expect(catalog.libraryManifest?.experimental.total).toBe(1);
  const drafts = await catalog.loadExperimentalSubject("電力");
  expect(drafts[0]).toMatchObject({ revision: manifest.experimental.shards[0]!.sha256, family: fixture[0]!.topic });
  expect(catalog.catalogue[0]!.revision).toBe(fixture[0]!.revision);
});

it("rejects a substituted file, wrong count, and an unsafe manifest path", async () => {
  manifest.catalog.sha256 = "wrong";
  await expect(catalog.loadServiceProblems()).rejects.toThrow("版が一致しません");
  refreshHash();
  manifest.catalog.count = 2;
  await expect(catalog.loadServiceProblems()).rejects.toThrow("件数が一致しません");
  manifest.catalog.file = "../private.json";
  await expect(catalog.loadServiceProblems()).rejects.toThrow("一覧が不正");
  expect(catalog.catalogue).toEqual([]);
});

it("rejects unreadable files and invalid problem structures", async () => {
  assetStatus = 503;
  await expect(catalog.loadServiceProblems()).rejects.toThrow("503");
  assetStatus = 200;
  payload = {};
  refreshHash();
  await expect(catalog.loadServiceProblems()).rejects.toThrow("教材形式");
  payload = [{}];
  refreshHash();
  await expect(catalog.loadServiceProblems()).rejects.toThrow("必須項目");
});

it("keeps unreviewed content out of normal study even with a valid checksum", async () => {
  payload = [
    {
      ...fixture[0],
      status: "draft",
      validation: { ...fixture[0]!.validation, human_checked: false, supervisor_checked: false },
    },
  ];
  refreshHash();
  await expect(catalog.loadServiceProblems()).rejects.toThrow("未確認");
  expect(catalog.catalogue).toEqual([]);
});

it("uses the server-approved catalogue online and permits the checked local copy only while offline", async () => {
  state.isSite = true;
  state.api.mockResolvedValue({ problems: fixture.slice(0, 2) });
  expect(await catalog.loadServiceProblems()).toHaveLength(2);
  state.api.mockRejectedValue(new Error("server unavailable"));
  await expect(catalog.loadServiceProblems()).rejects.toThrow("server unavailable");
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
  expect(await catalog.loadServiceProblems()).toHaveLength(1);
});

it("initializes on demand and reports a missing or incomplete experimental subject", async () => {
  await expect(catalog.loadExperimentalSubject("unknown")).rejects.toThrow("検証用教材はありません");
  manifest.experimental.shards[0]!.count = 2;
  await catalog.loadServiceProblems();
  await expect(catalog.loadExperimentalSubject("電力")).rejects.toThrow("件数が一致しません");
});

it("reports a failed manifest request", async () => {
  vi.mocked(fetch).mockResolvedValue(new Response("unavailable", { status: 503 }));
  await expect(catalog.loadServiceProblems()).rejects.toThrow("教材一覧を取得できません");
});
