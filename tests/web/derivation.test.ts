import { describe, expect, it } from "vitest";
import {
  buildDerivationDrill,
  derivationScore,
  isDerivationCorrect,
  MIN_DERIVATION_STEPS,
} from "../../web/src/derivation.js";

const STEPS = ["まず公式を立てる", "数値を代入する", "整理して計算する", "単位を確認して答える"];

describe("buildDerivationDrill", () => {
  it("ステップが3未満なら null（並べ替えの意味が無い）", () => {
    expect(buildDerivationDrill([], 1)).toBeNull();
    expect(buildDerivationDrill(["a"], 1)).toBeNull();
    expect(buildDerivationDrill(["a", "b"], 1)).toBeNull();
  });

  it("MIN_DERIVATION_STEPS ちょうどなら成立する", () => {
    const d = buildDerivationDrill(["a", "b", "c"], 1);
    expect(d).not.toBeNull();
    expect((d as NonNullable<typeof d>).steps.length).toBe(MIN_DERIVATION_STEPS);
  });

  it("正解順は元の並び [0..n-1]", () => {
    const d = buildDerivationDrill(STEPS, 7);
    expect(d?.correctOrder).toEqual([0, 1, 2, 3]);
  });

  it("seed が同じなら提示順は決定論的に同一", () => {
    const a = buildDerivationDrill(STEPS, 42);
    const b = buildDerivationDrill(STEPS, 42);
    expect(a?.shuffledOrder).toEqual(b?.shuffledOrder);
  });

  it("提示順は元 index の置換（要素の取りこぼし・重複が無い）", () => {
    const d = buildDerivationDrill(STEPS, 3);
    expect([...(d?.shuffledOrder ?? [])].sort((x, y) => x - y)).toEqual([0, 1, 2, 3]);
  });

  it("提示順がそのまま正解順になることはない（必ず並べ替えがある）", () => {
    // 多数の seed で「最初から正解」になっていないことを確認。
    for (let seed = 0; seed < 50; seed++) {
      const d = buildDerivationDrill(STEPS, seed);
      expect(isDerivationCorrect(d?.shuffledOrder ?? [], d?.correctOrder ?? [])).toBe(false);
    }
  });
});

describe("isDerivationCorrect", () => {
  it("正解順と一致すれば true", () => {
    expect(isDerivationCorrect([0, 1, 2, 3], [0, 1, 2, 3])).toBe(true);
  });
  it("順序が違えば false", () => {
    expect(isDerivationCorrect([1, 0, 2, 3], [0, 1, 2, 3])).toBe(false);
  });
  it("長さが違えば false", () => {
    expect(isDerivationCorrect([0, 1, 2], [0, 1, 2, 3])).toBe(false);
  });
});

describe("derivationScore", () => {
  it("正しい位置にあるステップ数を返す", () => {
    expect(derivationScore([0, 1, 2, 3], [0, 1, 2, 3])).toBe(4);
    expect(derivationScore([0, 2, 1, 3], [0, 1, 2, 3])).toBe(2); // 0,3 が正位置
    expect(derivationScore([3, 2, 1, 0], [0, 1, 2, 3])).toBe(0);
  });
});
