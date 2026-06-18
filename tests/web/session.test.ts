import { describe, expect, it } from "vitest";
import type { Problem } from "../../lib/engine/schema.js";
import {
  enqueueRequeue,
  pushRecentTopic,
  REQUEUE_AFTER,
  type RequeueItem,
  takeDueRequeue,
} from "../../web/src/session.js";

const p = (id: string, topic = `t-${id}`): Problem => ({ id, topic }) as Problem;

describe("pushRecentTopic（直近 topic 履歴・#50）", () => {
  it("新しい順に積む", () => {
    let r: string[] = [];
    r = pushRecentTopic(r, "A");
    r = pushRecentTopic(r, "B");
    expect(r).toEqual(["B", "A"]);
  });

  it("窓サイズで古いものを落とす", () => {
    let r: string[] = [];
    for (const t of ["A", "B", "C", "D"]) r = pushRecentTopic(r, t, 3);
    expect(r).toEqual(["D", "C", "B"]); // 最新3件
  });

  it("元配列を破壊しない（純関数）", () => {
    const orig = ["A"];
    const next = pushRecentTopic(orig, "B");
    expect(orig).toEqual(["A"]);
    expect(next).toEqual(["B", "A"]);
  });
});

describe("requeue（間違えた問題の再出題・#49）", () => {
  it("間違えた問題を asked+REQUEUE_AFTER の期限で積む", () => {
    const q = enqueueRequeue([], p("X"), 5);
    expect(q).toHaveLength(1);
    expect(q[0]?.problem.id).toBe("X");
    expect(q[0]?.dueAt).toBe(5 + REQUEUE_AFTER);
  });

  it("同じ問題は二重登録しない", () => {
    let q: RequeueItem[] = enqueueRequeue([], p("X"), 1);
    q = enqueueRequeue(q, p("X"), 2);
    expect(q).toHaveLength(1);
  });

  it("期限前は取り出さない（短期の待機）", () => {
    const q = enqueueRequeue([], p("X"), 0); // dueAt = REQUEUE_AFTER
    const { problem } = takeDueRequeue(q, REQUEUE_AFTER - 1);
    expect(problem).toBeNull();
  });

  it("期限到来で取り出し、キューから消える", () => {
    const q = enqueueRequeue([], p("X"), 0); // dueAt = REQUEUE_AFTER
    const { problem, queue } = takeDueRequeue(q, REQUEUE_AFTER);
    expect(problem?.id).toBe("X");
    expect(queue).toHaveLength(0);
  });

  it("excludeId の問題は後回しにする（直近と同じ問題の連続を避ける）", () => {
    let q: RequeueItem[] = enqueueRequeue([], p("X"), 0);
    q = enqueueRequeue(q, p("Y"), 0);
    // 両方とも期限到来。excludeId=X なら Y が出る。
    const { problem } = takeDueRequeue(q, REQUEUE_AFTER, "X");
    expect(problem?.id).toBe("Y");
  });

  it("取り出しは元キューを破壊しない（純関数）", () => {
    const q = enqueueRequeue([], p("X"), 0);
    const before = q.length;
    takeDueRequeue(q, REQUEUE_AFTER);
    expect(q.length).toBe(before); // 元は不変
  });
});
