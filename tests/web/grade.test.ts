import { describe, expect, it } from "vitest";
import type { Problem } from "../../lib/engine/schema.js";
import { isAnswerCorrect, normalizeNumericInput, partialScore } from "../../web/src/grade.js";

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

describe("isAnswerCorrect（有効数字の許容誤差・#46）", () => {
  it("有効数字の丸め違いを正解にする（14.5 ≒ 14.52）", () => {
    // 14.52 に対し 14.5 は相対 0.14% < 0.5% → 正解。
    expect(isAnswerCorrect(numeric("14.52"), "14.5")).toBe(true);
    expect(isAnswerCorrect(numeric("14.5"), "14.52")).toBe(true);
  });

  it("明らかに違う値は不正解（14.52 に対し 14.6 / 15）", () => {
    // 14.6 は相対 0.55% > 0.5% → 不正解（境界の外）。
    expect(isAnswerCorrect(numeric("14.52"), "14.6")).toBe(false);
    expect(isAnswerCorrect(numeric("14.52"), "15")).toBe(false);
  });

  it("完全一致は当然正解（境界を緩めても exact を壊さない）", () => {
    expect(isAnswerCorrect(numeric("14.52"), "14.52")).toBe(true);
    expect(isAnswerCorrect(numeric("1000"), "1000")).toBe(true);
    expect(isAnswerCorrect(numeric("3.14159"), "3.14159")).toBe(true);
  });

  it("大きな値でも相対誤差で判定（900 に対し 901 は許容、910 は不正解）", () => {
    // 900 × 0.5% = 4.5 → 901 は許容、905 は境界外。
    expect(isAnswerCorrect(numeric("900"), "901")).toBe(true);
    expect(isAnswerCorrect(numeric("900"), "904")).toBe(true);
    expect(isAnswerCorrect(numeric("900"), "910")).toBe(false);
  });

  it("整数の近接誤答は弾く（50 に対し 49 は 2% で不正解）", () => {
    expect(isAnswerCorrect(numeric("50"), "49")).toBe(false);
    expect(isAnswerCorrect(numeric("50"), "50")).toBe(true);
  });
});

describe("isAnswerCorrect（その他は厳密一致）", () => {
  it("multiple_choice は選択肢テキストの厳密一致", () => {
    expect(isAnswerCorrect(mc("3.2"), "3.2")).toBe(true);
    // numeric と違い文字列一致なので "3.20" は別物（選択肢は固定テキスト）。
    expect(isAnswerCorrect(mc("3.2"), "3.20")).toBe(false);
  });
});

describe("partialScore（記述の部分点自己採点）", () => {
  it("全項目で easy、達成度で good/hard/again に写像", () => {
    expect(partialScore(4, 4)).toEqual({ pct: 1, rating: "easy" });
    expect(partialScore(3, 4).rating).toBe("good"); // 0.75 ≥ 2/3
    expect(partialScore(2, 4).rating).toBe("hard"); // 0.5 ≥ 1/3
    expect(partialScore(1, 4).rating).toBe("again"); // 0.25 < 1/3
    expect(partialScore(0, 4)).toEqual({ pct: 0, rating: "again" });
  });

  it("total=0 や範囲外入力を安全に扱う", () => {
    expect(partialScore(3, 0)).toEqual({ pct: 0, rating: "again" });
    expect(partialScore(9, 4).rating).toBe("easy"); // checked を total にクランプ
  });
});
