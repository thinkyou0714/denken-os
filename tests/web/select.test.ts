import { describe, expect, it } from "vitest";
import type { Problem } from "../../lib/engine/schema.js";
import { pickNextProblem } from "../../web/src/select.js";

function p(id: string, topic: string): Problem {
  return { id, topic } as Problem;
}
const pool = [p("A", "理論"), p("B", "理論"), p("C", "機械"), p("D", "電力")];

describe("pickNextProblem", () => {
  it("空配列なら null", () => {
    expect(pickNextProblem([], { weakTopics: [] })).toBeNull();
  });

  it("弱点 topic を最優先で選ぶ", () => {
    const chosen = pickNextProblem(pool, { weakTopics: ["機械"], rng: () => 0 });
    expect(chosen?.id).toBe("C");
  });

  it("弱点 topic に該当が無ければ次の弱点→全体へフォールバック", () => {
    const chosen = pickNextProblem(pool, { weakTopics: ["法規", "電力"], rng: () => 0 });
    expect(chosen?.topic).toBe("電力");
  });

  it("直近の問題(excludeId)は他に候補があれば避ける", () => {
    // 理論は A,B の2問。rng=0 は先頭を選ぶが、excludeId=A なら B になる。
    const chosen = pickNextProblem(pool, { weakTopics: ["理論"], rng: () => 0, excludeId: "A" });
    expect(chosen?.id).toBe("B");
  });

  it("候補が1問だけなら excludeId でも同じ問題を返す（出題継続を優先）", () => {
    const chosen = pickNextProblem([p("solo", "機械")], { weakTopics: ["機械"], rng: () => 0, excludeId: "solo" });
    expect(chosen?.id).toBe("solo");
  });

  it("弱点指定なしでも全体から1問返す", () => {
    const chosen = pickNextProblem(pool, { weakTopics: [], rng: () => 0 });
    expect(chosen).not.toBeNull();
  });

  // SCHED-INTERLEAVE: 同 topic 連発を抑制し、別 topic を挟む（interleaving）。
  it("同 topic が連続上限に達したら別の弱点 topic を挟む", () => {
    // 理論が直近2連続(上限)。弱点は [理論, 機械] → 理論は後回しで機械(C)を返す。
    const chosen = pickNextProblem(pool, {
      weakTopics: ["理論", "機械"],
      rng: () => 0,
      recentTopics: ["理論", "理論"],
      maxSameTopicRun: 2,
    });
    expect(chosen?.topic).toBe("機械");
  });

  it("連続上限でも当該 topic しか候補が無ければ妥協して出す（継続優先）", () => {
    const onlyTheory = [p("A", "理論"), p("B", "理論")];
    const chosen = pickNextProblem(onlyTheory, {
      weakTopics: ["理論"],
      rng: () => 0,
      recentTopics: ["理論", "理論"],
      maxSameTopicRun: 2,
    });
    expect(chosen?.topic).toBe("理論");
  });

  it("recentTopics 未指定なら従来挙動（回帰なし）", () => {
    const chosen = pickNextProblem(pool, { weakTopics: ["機械"], rng: () => 0 });
    expect(chosen?.id).toBe("C");
  });
});
