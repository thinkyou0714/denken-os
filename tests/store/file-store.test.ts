import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Problem } from "../../lib/engine/schema.js";
import { Sm2Scheduler } from "../../lib/scheduler/sm2.js";
import { fileStores } from "../../lib/store/file-store.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const T0001: Problem = JSON.parse(readFileSync(join(__dirname, "../../data/problems/T-0001.json"), "utf8"));
const PROV = { validated_by: "store-test", validated_at: "2026-06-01", method: "fixture" };
const validatedT0001: Problem = {
  ...T0001,
  status: "validated",
  validation: { ...T0001.validation, provenance: PROV },
};

describe("FileStores（JSON永続化）", () => {
  let dir: string;
  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), "denken-store-"));
  });
  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("ProblemStore は再読込しても永続化されている", async () => {
    const a = fileStores(dir);
    await a.problems.upsert(validatedT0001);
    // 別インスタンスから読んでも残っている（=ファイルに書かれている）
    const b = fileStores(dir);
    expect((await b.problems.get("T-0001"))?.answer).toBe("3.2");
    expect((await b.problems.list({ status: "validated" })).length).toBe(1);
  });

  it("ReviewStateStore はユーザー×論点で永続化される", async () => {
    const s = fileStores(dir);
    const sched = new Sm2Scheduler();
    await s.reviewStates.set("u1", "三相交流電力", sched.review(sched.init(0), "good", 0));
    const reloaded = fileStores(dir);
    expect((await reloaded.reviewStates.get("u1", "三相交流電力"))?.reps).toBe(1);
    expect((await reloaded.reviewStates.byUser("u1")).size).toBe(1);
  });

  it("AnswerLogStore は追記される", async () => {
    const s = fileStores(dir);
    await s.answerLogs.append("u1", { topic: "理論", correct: true, atMs: 1 });
    await s.answerLogs.append("u1", { topic: "理論", correct: false, atMs: 2 });
    expect((await fileStores(dir).answerLogs.byUser("u1")).length).toBe(2);
  });
});
