import { describe, expect, it } from "vitest";
import { type AnswerLog, aggregateByTopic, weakestTopics, wilsonLowerBound } from "../../lib/scheduler/diagnosis.js";

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

  // SCHED-2: 実 due を渡すと「次回予定からの超過」で測り、recency 逆転を解消する。
  it("実 due 渡し: 未到来(未来due)の50%は到来済(過去due)の50%より優先されない", () => {
    const day = 86_400_000;
    const now = Date.UTC(2026, 0, 20);
    const ans = (topic: string, correct: boolean): AnswerLog => ({ topic, correct, atMs: now - 10 * day });
    // A,B とも 50%。A は未来due(未到来)、B は過去due(超過)。
    const logs: AnswerLog[] = [ans("A", true), ans("A", false), ans("B", true), ans("B", false)];
    const dueByTopic = new Map([
      ["A", now + 5 * day], // まだ復習予定が来ていない
      ["B", now - 5 * day], // 復習予定を5日超過
    ]);
    const weak = weakestTopics(aggregateByTopic(logs, dueByTopic).values(), now, 2);
    expect(weak[0]).toBe("B");
  });

  it("実 due 渡し: 習得済(100%・遠い未来due)が低正答率(20%・今日)を上回らない", () => {
    const day = 86_400_000;
    const now = Date.UTC(2026, 0, 20);
    const logs: AnswerLog[] = [
      // mastered: 5/5 正解、25日前
      ...Array.from({ length: 5 }, () => ({ topic: "mastered", correct: true, atMs: now - 25 * day })),
      // weak: 1/5 正解、今日
      ...Array.from({ length: 5 }, (_, i) => ({ topic: "weak", correct: i === 0, atMs: now })),
    ];
    const dueByTopic = new Map([
      ["mastered", now + 30 * day], // 遠い未来（よく覚えている）
      ["weak", now], // 今日が due
    ]);
    const weak = weakestTopics(aggregateByTopic(logs, dueByTopic).values(), now, 1);
    expect(weak[0]).toBe("weak");
  });

  // D2: Wilson 下側で少試行を過大評価しない（1/1 を満点扱いしない）。
  it("wilsonLowerBound: 少試行は中央へ縮約し、n増で rate に収束", () => {
    expect(wilsonLowerBound(0, 0)).toBe(0);
    expect(wilsonLowerBound(1, 1)).toBeLessThan(1); // 1/1 でも 1.0 にしない
    expect(wilsonLowerBound(50, 50)).toBeGreaterThan(wilsonLowerBound(1, 1)); // n大ほど高確信
    const c = wilsonLowerBound(8, 10);
    expect(c).toBeGreaterThanOrEqual(0);
    expect(c).toBeLessThanOrEqual(1);
  });

  // D1: 旧『試行が多いほど弱点加点』の逆転を是正。同 rate/同 due なら試行が少ない方を優先。
  it("同 rate(50%)・同 due なら試行が少ない(不確実な) topic を優先", () => {
    const now = Date.UTC(2026, 0, 20);
    const logs: AnswerLog[] = [
      // few: 2試行1正解(50%)
      { topic: "few", correct: true, atMs: now },
      { topic: "few", correct: false, atMs: now },
      // many: 8試行4正解(50%)
      ...Array.from({ length: 8 }, (_, i) => ({ topic: "many", correct: i % 2 === 0, atMs: now })),
    ];
    const weak = weakestTopics(aggregateByTopic(logs).values(), now, 2);
    expect(weak[0]).toBe("few");
  });
});
