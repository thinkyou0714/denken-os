/**
 * PEDX-01: 2回目挑戦ループの状態遷移。
 */
import { describe, expect, it } from "vitest";
import { nextAttemptState } from "../../web/src/attempt.js";

describe("nextAttemptState", () => {
  it("初回正解は即 reveal(correct)", () => {
    expect(nextAttemptState({ format: "numeric", correct: true, attemptNo: 1 })).toEqual({
      kind: "reveal",
      correct: true,
    });
  });

  it("初回誤答(択一/数値)は retry", () => {
    expect(nextAttemptState({ format: "multiple_choice", correct: false, attemptNo: 1 })).toEqual({ kind: "retry" });
    expect(nextAttemptState({ format: "numeric", correct: false, attemptNo: 1 })).toEqual({ kind: "retry" });
  });

  it("2回目誤答は reveal(incorrect)", () => {
    expect(nextAttemptState({ format: "numeric", correct: false, attemptNo: 2 })).toEqual({
      kind: "reveal",
      correct: false,
    });
  });

  it("記述(descriptive)は常に reveal（自己採点フロー）", () => {
    expect(nextAttemptState({ format: "descriptive", correct: false, attemptNo: 1 })).toEqual({
      kind: "reveal",
      correct: false,
    });
  });

  it("maxAttempts を上げると retry 回数が増える", () => {
    expect(nextAttemptState({ format: "numeric", correct: false, attemptNo: 2, maxAttempts: 3 })).toEqual({
      kind: "retry",
    });
  });
});
