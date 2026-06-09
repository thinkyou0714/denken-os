import { describe, expect, it } from "vitest";
import type { Problem } from "../../lib/engine/schema.js";
import { dueReviewProblems, mistakeNotebook } from "../../web/src/review.js";
import type { WebAnswerLog } from "../../web/src/store.js";

function prob(id: string, topic: string): Problem {
  return {
    id,
    subject: "理論",
    topic,
    difficulty: 2,
    statement: "x",
    answer: "1",
    solution: ["1"],
    validation: { solver_checked: true, human_checked: false, clean_answer: true, physically_valid: true },
    source: { type: "original" },
  };
}

const problems: Problem[] = [prob("A", "三相交流電力"), prob("B", "需要率"), prob("C", "三相交流電力")];

describe("review（復習・間違いノート）", () => {
  it("dueReviewProblems: due topic の問題のみを due 順で返す", () => {
    const out = dueReviewProblems(problems, ["需要率", "三相交流電力"]);
    expect(out[0]?.topic).toBe("需要率"); // dueTopics の順序を尊重
    expect(out.filter((p) => p.topic === "三相交流電力").length).toBe(2);
    expect(out.length).toBe(3);
  });

  it("dueReviewProblems: due が空なら空", () => {
    expect(dueReviewProblems(problems, [])).toEqual([]);
  });

  it("mistakeNotebook: problemId 単位で誤答を集計し誤答数の多い順に返す", () => {
    const logs: WebAnswerLog[] = [
      { topic: "三相交流電力", correct: false, atMs: 1, problemId: "A" },
      { topic: "三相交流電力", correct: false, atMs: 3, problemId: "A" },
      { topic: "需要率", correct: false, atMs: 2, problemId: "B" },
      { topic: "需要率", correct: true, atMs: 4, problemId: "B" },
    ];
    const nb = mistakeNotebook(logs, problems);
    expect(nb[0]?.problem.id).toBe("A"); // 誤答2回
    expect(nb[0]?.missCount).toBe(2);
    expect(nb[1]?.problem.id).toBe("B"); // 誤答1回・試行2回
    expect(nb[1]?.missCount).toBe(1);
    expect(nb[1]?.attempts).toBe(2);
  });

  it("mistakeNotebook: 全問正解の problemId は載らない", () => {
    const logs: WebAnswerLog[] = [{ topic: "需要率", correct: true, atMs: 1, problemId: "B" }];
    expect(mistakeNotebook(logs, problems)).toEqual([]);
  });

  it("mistakeNotebook: problemId 無しのログは無視（topic 単位は対象外）", () => {
    const logs: WebAnswerLog[] = [{ topic: "三相交流電力", correct: false, atMs: 1 }];
    expect(mistakeNotebook(logs, problems)).toEqual([]);
  });
});
