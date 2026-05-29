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
});
