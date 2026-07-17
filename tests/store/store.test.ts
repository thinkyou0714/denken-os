import { describe, expect, it } from "vitest";
import { type AnswerLog, aggregateByTopic, weakestTopics } from "../../lib/scheduler/diagnosis.js";
import { Sm2Scheduler } from "../../lib/scheduler/sm2.js";
import { InMemoryAnswerLogStore, InMemoryProblemStore, InMemoryReviewStateStore } from "../../lib/store/index.js";
import { loadProblemFixture } from "../helpers/fixtures.js";

const T0001 = loadProblemFixture("T-0001");

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

  it("AnswerLogStore は順不同 append でも byUser を atMs 昇順で返す（契約）", async () => {
    const logs = new InMemoryAnswerLogStore();
    await logs.append("u1", { topic: "後", correct: true, atMs: 3000 });
    await logs.append("u1", { topic: "先", correct: false, atMs: 1000 });
    await logs.append("u1", { topic: "中", correct: true, atMs: 2000 });
    expect((await logs.byUser("u1")).map((l) => l.atMs)).toEqual([1000, 2000, 3000]);
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
