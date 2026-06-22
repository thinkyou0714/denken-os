import { describe, expect, it } from "vitest";
import type { Problem } from "../../lib/engine/schema.js";
import type { AnswerLog } from "../../lib/scheduler/diagnosis.js";
import { missedProblemIds, pickNextProblem } from "../../web/src/select.js";

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

  it("インターリーブ: 直近に出した弱点 topic は後回しにする（#50）", () => {
    // 弱点が 理論→機械 の順でも、直近に理論を出していれば機械を優先する。
    const chosen = pickNextProblem(pool, {
      weakTopics: ["理論", "機械"],
      recentTopics: ["理論"],
      rng: () => 0,
    });
    expect(chosen?.topic).toBe("機械");
  });

  it("インターリーブ: 全弱点が直近に出ていれば元の優先順を保つ（後回し先が無い）", () => {
    const chosen = pickNextProblem(pool, {
      weakTopics: ["理論", "機械"],
      recentTopics: ["理論", "機械"],
      rng: () => 0,
    });
    // 両方 stale → 元順（理論が先頭）。
    expect(chosen?.topic).toBe("理論");
  });

  it("インターリーブ: recentTopics 未指定なら従来どおり優先順で選ぶ", () => {
    const chosen = pickNextProblem(pool, { weakTopics: ["理論", "機械"], rng: () => 0 });
    expect(chosen?.topic).toBe("理論");
  });

  it("問題単位の弱点バイアス: topic 内で過去に間違えた問題を優先する", () => {
    // 理論は A,B の2問。rng=0 は通常 A を選ぶが、B が missed なら B を優先する。
    const chosen = pickNextProblem(pool, {
      weakTopics: ["理論"],
      rng: () => 0,
      missedIds: new Set(["B"]),
    });
    expect(chosen?.id).toBe("B");
  });

  it("問題単位の弱点バイアス: missed が topic 内に無ければ通常選択にフォールバック", () => {
    const chosen = pickNextProblem(pool, {
      weakTopics: ["理論"],
      rng: () => 0,
      missedIds: new Set(["C"]), // C は機械。理論の候補には無い。
    });
    expect(chosen?.id).toBe("A"); // 通常どおり先頭
  });

  it("問題単位の弱点バイアス: excludeId で連続を避けつつ missed を優先する", () => {
    // 理論 A,B が両方 missed。excludeId=A なら B（連続回避が miss バイアスより先）。
    const chosen = pickNextProblem(pool, {
      weakTopics: ["理論"],
      rng: () => 0,
      excludeId: "A",
      missedIds: new Set(["A", "B"]),
    });
    expect(chosen?.id).toBe("B");
  });
});

describe("missedProblemIds", () => {
  const log = (problemId: string, correct: boolean, atMs: number): AnswerLog => ({
    topic: "t",
    correct,
    atMs,
    problemId,
  });

  it("最後の解答が誤答の問題IDを集める", () => {
    const missed = missedProblemIds([log("A", false, 1), log("B", true, 2)]);
    expect(missed.has("A")).toBe(true);
    expect(missed.has("B")).toBe(false);
  });

  it("後で正解したら克服済みとみなして外す（最新で判定）", () => {
    const missed = missedProblemIds([log("A", false, 1), log("A", true, 5)]);
    expect(missed.has("A")).toBe(false);
  });

  it("後で間違えたら最新の誤答で入る", () => {
    const missed = missedProblemIds([log("A", true, 1), log("A", false, 5)]);
    expect(missed.has("A")).toBe(true);
  });

  it("時系列が前後しても atMs の最大で判定する", () => {
    // 順不同（古い誤答が後ろにある）でも最新(atMs=5)の正解が勝つ。
    const missed = missedProblemIds([log("A", true, 5), log("A", false, 1)]);
    expect(missed.has("A")).toBe(false);
  });

  it("problemId の無いログは無視する", () => {
    const missed = missedProblemIds([{ topic: "t", correct: false, atMs: 1 }]);
    expect(missed.size).toBe(0);
  });
});
