/**
 * narration-match.test.ts — narrationMatchesAnswer の拡張ケースを検証する。
 *
 * 既存テスト (validate.test.ts) は変更禁止のため、指数表記・符号付き数値・
 * 最終行一致など I-013 で追加した受理ケースをここに追加する。
 */
import { describe, expect, it } from "vitest";
import { narrationMatchesAnswer } from "../../lib/engine/validate.js";

describe("narrationMatchesAnswer — 指数表記の受理（I-013 拡張）", () => {
  it("1.5e3 (=1500) を答え '1500' として受理する", () => {
    expect(narrationMatchesAnswer(["電流 I=1.5e3A", "よって答えは 1.5e3A"], "1500")).toBe(true);
  });

  it("2E-4 (=0.0002) を答え '0.0002' として受理する", () => {
    expect(narrationMatchesAnswer(["R=2E-4Ω", "計算結果 2E-4"], "0.0002")).toBe(true);
  });

  it("3.2e1 (=32) を答え '32' として受理する", () => {
    expect(narrationMatchesAnswer(["P=3.2e1kW"], "32")).toBe(true);
  });

  it("1e6 (=1000000) を答え '1000000' として受理する", () => {
    expect(narrationMatchesAnswer(["容量 1e6VA"], "1000000")).toBe(true);
  });

  it("5.0e0 (=5) を答え '5' として受理する（指数0）", () => {
    expect(narrationMatchesAnswer(["η=5.0e0"], "5")).toBe(true);
  });

  it("指数表記で期待値と異なる場合は不一致", () => {
    expect(narrationMatchesAnswer(["I=2.5e3A"], "1500")).toBe(false);
  });
});

describe("narrationMatchesAnswer — 符号付き数値の受理（I-013 拡張）", () => {
  it("+3.2 を答え '3.2' として受理する（プラス符号付き）", () => {
    expect(narrationMatchesAnswer(["答え: +3.2kW"], "3.2")).toBe(true);
  });

  it("-5.0 を答え '-5' として受理する（マイナス符号付き）", () => {
    expect(narrationMatchesAnswer(["温度差 -5.0 ℃"], "-5")).toBe(true);
  });

  it("符号なし '3.2' も引き続き受理する（既存挙動維持）", () => {
    expect(narrationMatchesAnswer(["P=3.2kW"], "3.2")).toBe(true);
  });
});

describe("narrationMatchesAnswer — 最終行一致（既存挙動確認）", () => {
  it("最終ステップにのみ答えが現れる場合も受理する", () => {
    expect(narrationMatchesAnswer(["手順1: ...", "手順2: ...", "よって答えは 42"], "42")).toBe(true);
  });

  it("先頭ステップにしか答えが現れない場合も（全ステップ検索で）受理する", () => {
    expect(narrationMatchesAnswer(["P=100W=0.1kW", "したがって..."], "0.1")).toBe(true);
  });

  it("ε の範囲内の浮動小数点誤差は許容する", () => {
    // 0.1 + 0.2 = 0.30000000000000004 のような計算誤差をεで吸収
    expect(narrationMatchesAnswer(["P=0.30000000000000004kW"], "0.3")).toBe(true);
  });
});

describe("narrationMatchesAnswer — 非数値答えの挙動（既存挙動確認）", () => {
  it("非数値の答えは some(s.includes) で受理する", () => {
    expect(narrationMatchesAnswer(["まとめると 遅れ力率 となる"], "遅れ力率")).toBe(true);
  });

  it("非数値の答えが全ステップに現れなければ不一致", () => {
    expect(narrationMatchesAnswer(["進み力率となる"], "遅れ力率")).toBe(false);
  });
});

describe("narrationMatchesAnswer — 指数表記 + 符号の組み合わせ", () => {
  it("-1.5e3 (=-1500) を答え '-1500' として受理する", () => {
    expect(narrationMatchesAnswer(["変化量 -1.5e3W"], "-1500")).toBe(true);
  });

  it("+2.0E+2 (=200) を答え '200' として受理する", () => {
    expect(narrationMatchesAnswer(["出力 +2.0E+2W"], "200")).toBe(true);
  });
});
