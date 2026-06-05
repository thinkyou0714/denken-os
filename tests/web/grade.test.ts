import { describe, expect, it } from "vitest";
import type { Problem } from "../../lib/engine/schema.js";
import { isAnswerCorrect, normalizeNumericInput } from "../../web/src/grade.js";

/** isAnswerCorrect は format と answer のみ参照するので最小構成で十分。 */
function numeric(answer: string): Problem {
  return { format: "numeric", answer } as Problem;
}
function mc(answer: string): Problem {
  return { format: "multiple_choice", answer } as Problem;
}

describe("normalizeNumericInput", () => {
  it("全角数字を半角化する", () => {
    expect(normalizeNumericInput("５０")).toBe("50");
    expect(normalizeNumericInput("１２．５")).toBe("12.5");
  });
  it("桁区切り・空白を除去する", () => {
    expect(normalizeNumericInput(" 1,200 ")).toBe("1200");
    expect(normalizeNumericInput("3 . 2")).toBe("3.2");
  });
});

describe("isAnswerCorrect（numeric は数値比較）", () => {
  it('"50" の問題に "50.0" / "50" / 全角 "５０" を正解扱いする', () => {
    expect(isAnswerCorrect(numeric("50"), "50.0")).toBe(true);
    expect(isAnswerCorrect(numeric("50"), "50")).toBe(true);
    expect(isAnswerCorrect(numeric("50"), "５０")).toBe(true);
    expect(isAnswerCorrect(numeric("50"), " 50 ")).toBe(true);
  });
  it('"3.2" と "3.20" を一致させる', () => {
    expect(isAnswerCorrect(numeric("3.2"), "3.20")).toBe(true);
  });
  it("数値が違えば不正解", () => {
    expect(isAnswerCorrect(numeric("50"), "49")).toBe(false);
    expect(isAnswerCorrect(numeric("50"), "")).toBe(false);
    expect(isAnswerCorrect(numeric("50"), "abc")).toBe(false);
  });
});

describe("isAnswerCorrect（その他は厳密一致）", () => {
  it("multiple_choice は選択肢テキストの厳密一致", () => {
    expect(isAnswerCorrect(mc("3.2"), "3.2")).toBe(true);
    // numeric と違い文字列一致なので "3.20" は別物（選択肢は固定テキスト）。
    expect(isAnswerCorrect(mc("3.2"), "3.20")).toBe(false);
  });
});
