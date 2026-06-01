import { describe, expect, it } from "vitest";
import { type AnswerLog, aggregateByTopic, weakestTopics } from "../../lib/scheduler/diagnosis.js";

describe("弱点診断", () => {
  it("連続不正解の topic ほど優先度が上がる", () => {
    const now = Date.UTC(2026, 0, 10);
    const logs: AnswerLog[] = [
      // 三相交流電力: 3回中3回不正解 → 弱点
      { topic: "三相交流電力", correct: false, atMs: now },
      { topic: "三相交流電力", correct: false, atMs: now },
      { topic: "三相交流電力", correct: false, atMs: now },
      // 直流回路: 3回中3回正解 → 得意
      { topic: "直流回路", correct: true, atMs: now },
      { topic: "直流回路", correct: true, atMs: now },
      { topic: "直流回路", correct: true, atMs: now },
    ];
    const prog = aggregateByTopic(logs);
    const weak = weakestTopics(prog.values(), now, 2);
    expect(weak[0]).toBe("三相交流電力");
  });

  it("dueMs は並び順に依存せず最新の解答時刻になる", () => {
    const day = 86_400_000;
    const t0 = Date.UTC(2026, 0, 1);
    // わざと新しい→古い→中間の順（order 未指定の DB を模す）。
    const logs: AnswerLog[] = [
      { topic: "機械", correct: false, atMs: t0 + 2 * day },
      { topic: "機械", correct: true, atMs: t0 },
      { topic: "機械", correct: false, atMs: t0 + 1 * day },
    ];
    const prog = aggregateByTopic(logs);
    const m = prog.get("機械")!;
    expect(m.attempts).toBe(3);
    expect(m.dueMs).toBe(t0 + 2 * day); // 配列末尾(t0+1day)ではなく最新
  });
});
