import { describe, expect, it } from "vitest";
import type { Problem } from "../../lib/engine/schema.js";
import { feedbackParts, isAnswerCorrect, normalizeNumericInput } from "../../web/src/grade.js";

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

  it('答えが "0" でも空/空白入力は正解にしない（Number("")===0 の罠）', () => {
    expect(isAnswerCorrect(numeric("0"), "")).toBe(false);
    expect(isAnswerCorrect(numeric("0"), "   ")).toBe(false);
    expect(isAnswerCorrect(numeric("0"), "　")).toBe(false); // 全角空白
    // 実際に 0 と入力したときだけ正解。
    expect(isAnswerCorrect(numeric("0"), "0")).toBe(true);
    expect(isAnswerCorrect(numeric("0"), "0.0")).toBe(true);
  });
});

describe("isAnswerCorrect（その他は厳密一致）", () => {
  it("multiple_choice は選択肢テキストの厳密一致", () => {
    expect(isAnswerCorrect(mc("3.2"), "3.2")).toBe(true);
    // numeric と違い文字列一致なので "3.20" は別物（選択肢は固定テキスト）。
    expect(isAnswerCorrect(mc("3.2"), "3.20")).toBe(false);
  });
});

describe("feedbackParts（A3: 視覚と読み上げの分離）", () => {
  it("speech に絵文字を含めず、正解値を読み下す", () => {
    const ok = feedbackParts(true, "3.2");
    expect(ok.visual).toContain("⭕");
    expect(ok.speech).toBe("正解です");

    const ng = feedbackParts(false, "5Ω");
    expect(ng.visual).toContain("❌");
    expect(ng.speech).not.toMatch(/[⭕❌]/);
    expect(ng.speech).toContain("オーム"); // mathToSpeech で Ω を読み下す
    expect(ng.speech).toContain("不正解");
  });
});
