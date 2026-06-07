/**
 * data-checks: JSON Schema で表せないデータ不変条件（DI-4 離散ドメイン / DI-6 citation 書式 / B2 範囲）。
 */
import { describe, expect, it } from "vitest";
import { citationIssue, numericAnswerIssue, paramIssues } from "../../lib/engine/data-checks.js";

describe("paramIssues（範囲 + 離散ドメイン）", () => {
  it("妥当な params は問題なし", () => {
    expect(
      paramIssues({
        frequency: { value: 60, realistic_range: [50, 60] },
        poles: { value: 4, realistic_range: [2, 12] },
        slip: { value: 5, realistic_range: [1, 10] },
      }),
    ).toEqual([]);
  });

  it("realistic_range 外を検出（B2）", () => {
    const issues = paramIssues({ R: { value: 999, realistic_range: [1, 50] } });
    expect(issues.some((m) => m.includes("realistic_range"))).toBe(true);
  });

  it("極数が偶数でない／2未満を弾く（DI-4）", () => {
    expect(paramIssues({ poles: { value: 7, realistic_range: [2, 12] } }).some((m) => m.includes("偶数"))).toBe(true);
    expect(paramIssues({ poles: { value: 4, realistic_range: [2, 12] } })).toEqual([]);
  });

  it("商用周波数が50/60以外を弾く（DI-4）", () => {
    expect(paramIssues({ frequency: { value: 55, realistic_range: [50, 60] } }).some((m) => m.includes("周波数"))).toBe(
      true,
    );
    expect(paramIssues({ frequency: { value: 50, realistic_range: [50, 60] } })).toEqual([]);
  });
});

describe("citationIssue（出典書式 DI-6）", () => {
  it("original は対象外（null）", () => {
    expect(citationIssue({ type: "original" })).toBeNull();
    expect(citationIssue({ type: "original", citation: "DENKEN-OS オリジナル問題" })).toBeNull();
  });

  it("past_exam_* は citation 必須", () => {
    expect(citationIssue({ type: "past_exam_quoted" })).toContain("必須");
    expect(citationIssue({ type: "past_exam_modified", citation: "   " })).toContain("必須");
  });

  it("past_exam_* の citation は年度を含む必要がある", () => {
    expect(citationIssue({ type: "past_exam_quoted", citation: "どこかの問題" })).toContain("年度");
    expect(
      citationIssue({ type: "past_exam_quoted", citation: "令和5年度 第二種電気主任技術者試験 一次 機械" }),
    ).toBeNull();
    expect(citationIssue({ type: "past_exam_modified", citation: "2019 第二種 一次 機械（一部改変）" })).toBeNull();
  });
});

describe("numericAnswerIssue（E4: 採点 round-trip 保証）", () => {
  it("numeric の単位なし数値は通る", () => {
    expect(numericAnswerIssue({ format: "numeric", answer: "4.6" })).toBeNull();
    expect(numericAnswerIssue({ format: "numeric", answer: "1306.8" })).toBeNull();
  });

  it("numeric の単位付き/非数値を弾く（Number() で NaN 化する）", () => {
    expect(numericAnswerIssue({ format: "numeric", answer: "4.6Ω" })).toContain("数値");
    expect(numericAnswerIssue({ format: "numeric", answer: "遅れ" })).toContain("数値");
  });

  it('空文字/空白のみの answer を弾く（Number("")===0 で全回答が 0 と誤一致するのを防ぐ）', () => {
    expect(numericAnswerIssue({ format: "numeric", answer: "" })).toContain("数値");
    expect(numericAnswerIssue({ format: "numeric", answer: "   " })).toContain("数値");
    expect(numericAnswerIssue({ format: "numeric", answer: "　" })).toContain("数値"); // 全角空白
    expect(numericAnswerIssue({ format: "numeric", answer: undefined })).toContain("数値");
    // 正当な "0" は通る（空入力とは区別する）。
    expect(numericAnswerIssue({ format: "numeric", answer: "0" })).toBeNull();
  });

  it("numeric 以外は対象外", () => {
    expect(numericAnswerIssue({ format: "multiple_choice", answer: "3.2" })).toBeNull();
    expect(numericAnswerIssue({ format: "descriptive", answer: "遅れ力率" })).toBeNull();
  });
});
