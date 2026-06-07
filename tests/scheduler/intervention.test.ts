/**
 * D6: 連続誤答の検出と介入。
 */
import { describe, expect, it } from "vitest";
import type { AnswerLog } from "../../lib/scheduler/diagnosis.js";
import { consecutiveFailures, intervention } from "../../lib/scheduler/intervention.js";

const log = (topic: string, correct: boolean, atMs = 0): AnswerLog => ({ topic, correct, atMs });

describe("consecutiveFailures", () => {
  it("末尾からの連続誤答を数える", () => {
    expect(consecutiveFailures([log("A", false), log("A", false)], "A")).toBe(2);
  });

  it("間に正解が入るとリセットされる", () => {
    expect(consecutiveFailures([log("A", false), log("A", true), log("A", false)], "A")).toBe(1);
  });

  it("他 topic は無視して当該 topic の連続だけ数える", () => {
    const logs = [log("A", false), log("B", true), log("A", false), log("B", false)];
    expect(consecutiveFailures(logs, "A")).toBe(2);
  });

  it("該当ログ無しは 0", () => {
    expect(consecutiveFailures([log("B", false)], "A")).toBe(0);
  });
});

describe("intervention", () => {
  it("2回で解説強制、3回以上で易問降段、それ以外は none", () => {
    expect(intervention(0)).toBe("none");
    expect(intervention(1)).toBe("none");
    expect(intervention(2)).toBe("force_explanation");
    expect(intervention(3)).toBe("ease_down");
    expect(intervention(5)).toBe("ease_down");
  });
});
