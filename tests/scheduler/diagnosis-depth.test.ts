/**
 * D4 mastery / D12 topic-state / D3 前提科目順 の純関数。
 */
import { describe, expect, it } from "vitest";
import type { AnswerLog } from "../../lib/scheduler/diagnosis.js";
import { masteryEWMA } from "../../lib/scheduler/mastery.js";
import { prioritizeFoundationFirst } from "../../lib/scheduler/prereq.js";
import { classifyTopic } from "../../lib/scheduler/topic-state.js";

const log = (topic: string, correct: boolean, atMs: number): AnswerLog => ({ topic, correct, atMs });

describe("masteryEWMA（D4: 直近重視）", () => {
  it("空 logs は中立 0.5", () => {
    expect(masteryEWMA([], "A")).toBe(0.5);
  });

  it("直近の正解列は誤答列より高い mastery", () => {
    const improving = [log("A", false, 1), log("A", false, 2), log("A", true, 3), log("A", true, 4), log("A", true, 5)];
    const declining = [log("A", true, 1), log("A", true, 2), log("A", true, 3), log("A", false, 4), log("A", false, 5)];
    expect(masteryEWMA(improving, "A")).toBeGreaterThan(masteryEWMA(declining, "A"));
  });

  it("他 topic は無視し、並び順に依存しない", () => {
    const a = [log("A", true, 3), log("B", false, 1), log("A", true, 2)];
    expect(masteryEWMA(a, "A")).toBeGreaterThan(0.5);
  });
});

describe("classifyTopic（D12）", () => {
  it("高 mastery は graduated", () => {
    expect(classifyTopic({ mastery: 0.9, overdueDays: 0 })).toBe("graduated");
  });
  it("低 mastery + 超過は relapsed", () => {
    expect(classifyTopic({ mastery: 0.4, overdueDays: 3 })).toBe("relapsed");
  });
  it("それ以外は learning", () => {
    expect(classifyTopic({ mastery: 0.7, overdueDays: 0 })).toBe("learning");
  });
});

describe("prioritizeFoundationFirst（D3: 理論優先）", () => {
  const subjectOf = (t: string): string | undefined =>
    ({ 直並列合成抵抗: "理論", 三相交流電力: "電力", 誘導機: "機械" })[t];

  it("理論 topic を前へ、同種内は元順を保つ", () => {
    const out = prioritizeFoundationFirst(["三相交流電力", "直並列合成抵抗", "誘導機"], subjectOf);
    expect(out[0]).toBe("直並列合成抵抗");
    expect(out.slice(1)).toEqual(["三相交流電力", "誘導機"]);
  });

  it("理論が無ければ順序不変", () => {
    expect(prioritizeFoundationFirst(["三相交流電力", "誘導機"], subjectOf)).toEqual(["三相交流電力", "誘導機"]);
  });
});
