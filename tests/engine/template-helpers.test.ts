/**
 * template-helpers.test.ts — テンプレート共有ヘルパー層（G1, I-011）のテスト。
 * pick / buildChoices / percentage / ensureRange / defineTemplate と
 * clean.ts の ANSWER_EPSILON / isCleanAnswer 境界を検証する。
 */
import { describe, expect, it } from "vitest";
import { ANSWER_EPSILON, formatClean, isCleanAnswer } from "../../lib/engine/clean.js";
import { buildChoices, defineTemplate, ensureRange, percentage, pick } from "../../lib/engine/templates/helpers.js";

describe("pick", () => {
  it("rng の値に応じた要素を返す", () => {
    const arr = [10, 20, 30, 40];
    expect(pick(arr, () => 0)).toBe(10);
    expect(pick(arr, () => 0.99)).toBe(40);
    expect(pick(arr, () => 0.5)).toBe(30);
  });

  it("空配列では明示的に throw する（I-002）", () => {
    expect(() => pick([], () => 0.5)).toThrow("pick: empty array");
  });

  it("要素1の配列は常にその要素を返す", () => {
    expect(pick(["only"], () => 0.999)).toBe("only");
  });
});

describe("buildChoices", () => {
  it("正解を含み数値昇順に整列する", () => {
    const choices = buildChoices("50", ["25", "100", "75"]);
    expect(choices).toEqual(["25", "50", "75", "100"]);
    expect(choices).toContain("50");
  });

  it("重複を排除する", () => {
    expect(buildChoices("10", ["10", "20", "20"])).toEqual(["10", "20"]);
  });

  it("数値でない要素は辞書順・数値の後に置く", () => {
    expect(buildChoices("b案", ["a案", "5"])).toEqual(["5", "a案", "b案"]);
  });
});

describe("percentage", () => {
  it("百分率を返す", () => {
    expect(percentage(30, 120)).toBe(25);
    expect(percentage(1, 3)).toBeCloseTo(33.333, 2);
  });

  it("分母0は NaN（呼び出し側で棄却する契約）", () => {
    expect(percentage(10, 0)).toBeNaN();
  });
});

describe("ensureRange", () => {
  it("閉区間 [min, max] の境界を含む", () => {
    expect(ensureRange(10, [10, 1000])).toBe(true);
    expect(ensureRange(1000, [10, 1000])).toBe(true);
    expect(ensureRange(9.999, [10, 1000])).toBe(false);
    expect(ensureRange(1000.001, [10, 1000])).toBe(false);
  });
});

describe("defineTemplate", () => {
  const ratio = defineTemplate<{ a: number; b: number }>({
    topic: "テスト比率",
    subject: "電力",
    exam: "denken3",
    difficulty: 1,
    paramSpecs: {
      a: { realistic_range: [1, 100] },
      b: { realistic_range: [1, 100] },
    },
    paramOrder: ["a", "b"],
    draw: () => ({ a: 30, b: 120 }),
    buildFrom({ a, b }) {
      if (a >= b) return null;
      const v = percentage(a, b);
      return {
        format: "numeric",
        params: {
          a: { value: a, realistic_range: [1, 100] },
          b: { value: b, realistic_range: [1, 100] },
        },
        answerValue: v,
        answerUnit: "%",
        answerText: formatClean(v),
        facts: { a, b },
        defaultStatement: `a=${a}, b=${b} の比率は?`,
        defaultSolution: [`${a}/${b}×100 = ${formatClean(v)}%`],
        physicallyValid: true,
      };
    },
  });

  it("generate は draw → buildFrom へ委譲する", () => {
    const r = ratio.generate(() => 0.5);
    expect(r).not.toBeNull();
    expect(r?.answerText).toBe("25");
  });

  it("generateFrom は同一 params で generate と同一結果（再現契約）", () => {
    const fromDraw = ratio.generate(() => 0.5);
    const fromFixed = ratio.generateFrom({ a: 30, b: 120 });
    expect(fromFixed).toEqual(fromDraw);
  });

  it("generateFrom は paramOrder のキー欠落で null", () => {
    expect(ratio.generateFrom({ a: 30 })).toBeNull();
  });

  it("buildFrom の不成立（null）を素通しする", () => {
    expect(ratio.generateFrom({ a: 120, b: 30 })).toBeNull();
  });
});

describe("clean.ts 境界（I-006/I-007）", () => {
  it("ANSWER_EPSILON が公開されている", () => {
    expect(ANSWER_EPSILON).toBe(1e-6);
  });

  it("isCleanAnswer: 小数2桁で割り切れる値を受理する", () => {
    expect(isCleanAnswer(25)).toBe(true);
    expect(isCleanAnswer(9.5)).toBe(true);
    expect(isCleanAnswer(10.35)).toBe(true);
  });

  it("isCleanAnswer: 割り切れない値・非有限値を拒否する", () => {
    expect(isCleanAnswer(1 / 3)).toBe(false);
    expect(isCleanAnswer(10.351)).toBe(false);
    expect(isCleanAnswer(Number.POSITIVE_INFINITY)).toBe(false);
    expect(isCleanAnswer(Number.NaN)).toBe(false);
  });

  it("isCleanAnswer: maxDecimals 指定の境界", () => {
    expect(isCleanAnswer(0.125, 3)).toBe(true);
    expect(isCleanAnswer(0.125, 2)).toBe(false);
    expect(isCleanAnswer(123456, 2)).toBe(true);
  });
});
