import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { Problem } from "../../lib/engine/schema.js";
import { type AnswerLog, aggregateByTopic, weakestTopics } from "../../lib/scheduler/diagnosis.js";
import { Sm2Scheduler } from "../../lib/scheduler/sm2.js";
import { InMemoryAnswerLogStore, InMemoryProblemStore, InMemoryReviewStateStore } from "../../lib/store/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const T0001: Problem = JSON.parse(readFileSync(join(__dirname, "../../data/problems/T-0001.json"), "utf8"));

describe("InMemory stores", () => {
  it("ProblemStore は upsert/get/list(filter) が動く", async () => {
    const s = new InMemoryProblemStore();
    await s.upsert(T0001);
    expect((await s.get("T-0001"))?.answer).toBe("3.2");
    expect((await s.list({ status: "validated" })).length).toBe(1);
    expect((await s.list({ topic: "存在しない" })).length).toBe(0);
  });

  it("ReviewStateStore はユーザー×論点で記憶状態を保存・取得できる", async () => {
    const s = new InMemoryReviewStateStore();
    const sched = new Sm2Scheduler();
    const st = sched.review(sched.init(0), "good", 0);
    await s.set("u1", "三相交流電力", st);
    expect((await s.get("u1", "三相交流電力"))?.reps).toBe(1);
    expect((await s.byUser("u1")).size).toBe(1);
    expect((await s.byUser("u2")).size).toBe(0);
  });

  it("解答ログ→弱点診断のエンドツーエンド（store経由）", async () => {
    const logs = new InMemoryAnswerLogStore();
    const now = Date.UTC(2026, 0, 10);
    const seq: AnswerLog[] = [
      { topic: "誘導電動機の回転速度", correct: false, atMs: now },
      { topic: "誘導電動機の回転速度", correct: false, atMs: now },
      { topic: "直並列合成抵抗", correct: true, atMs: now },
    ];
    for (const l of seq) await logs.append("u1", l);
    const prog = aggregateByTopic(await logs.byUser("u1"));
    expect(weakestTopics(prog.values(), now, 1)[0]).toBe("誘導電動機の回転速度");
  });
});
