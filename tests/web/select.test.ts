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
});
