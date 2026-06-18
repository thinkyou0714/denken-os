/**
 * narration-match.test.ts — narrationMatchesAnswer の拡張ケースを検証する。
 *
 * 既存テスト (validate.test.ts) は変更禁止のため、指数表記・符号付き数値・
 * 最終行一致など I-013 で追加した受理ケースをここに追加する。
 */
import { describe, expect, it } from "vitest";
import { narrationMatchesAnswer, statementMatchesParams } from "../../lib/engine/validate.js";

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

describe("narrationMatchesAnswer — 結論ステップ照合（engine#2 強化）", () => {
  it("最終ステップにのみ答えが現れる場合も受理する", () => {
    expect(narrationMatchesAnswer(["手順1: ...", "手順2: ...", "よって答えは 42"], "42")).toBe(true);
  });

  it("結論ステップが誤った値に書き換えられたら拒否する（偽陽性是正）", () => {
    // 旧実装は前段の '0.1' に誤マッチして受理していた。結論が無関係な値なら拒否する。
    expect(narrationMatchesAnswer(["P=100W=0.1kW", "したがって 0.5kW"], "0.1")).toBe(false);
  });

  it("括弧書きの補足注記は結論とみなさず、その前段の結論で照合する", () => {
    // 一次遅れ系の defaultSolution と同型: 最終行が「（…）」の補足。
    expect(narrationMatchesAnswer(["y(∞)=K×A", "y(∞)=20", "（t=T で63.2%に達する）"], "20")).toBe(true);
  });

  it("別解・ポイント行は結論から除外する", () => {
    expect(
      narrationMatchesAnswer(["P=3·I²·R=3.2kW", "別解 P=√3·V·I·cosφ でも一致", "ポイント: √3 の入れ忘れに注意"], "3.2"),
    ).toBe(true);
  });

  it("上付き指数 ×10⁻³ を実数として照合する（engine#4）", () => {
    expect(narrationMatchesAnswer(["静電容量 C=1×10⁻³F として求める"], "0.001")).toBe(true);
  });

  it("9×10⁹ の係数 9 が答え 9 に誤マッチしない（engine#4）", () => {
    expect(narrationMatchesAnswer(["クーロン定数 k=9×10⁹ を用いる"], "9")).toBe(false);
  });

  it("ε の範囲内の浮動小数点誤差は許容する", () => {
    // 0.1 + 0.2 = 0.30000000000000004 のような計算誤差をεで吸収
    expect(narrationMatchesAnswer(["P=0.30000000000000004kW"], "0.3")).toBe(true);
  });

  it("空の解説は不一致", () => {
    expect(narrationMatchesAnswer([], "42")).toBe(false);
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

describe("statementMatchesParams — 問題文のパラメータ整合（engine#1）", () => {
  it("全パラメータ値が問題文に現れれば true", () => {
    expect(statementMatchesParams("線間電圧200V、R=3Ω、X=4Ωのとき…", [200, 3, 4])).toBe(true);
  });

  it("パラメータ値が改変されていれば false（→ defaultStatement へフォールバック）", () => {
    // LLM が 200V を 210V に書き換えたケース。
    expect(statementMatchesParams("線間電圧210V、R=3Ω、X=4Ωのとき…", [200, 3, 4])).toBe(false);
  });

  it("小数パラメータも整形一致で判定する", () => {
    expect(statementMatchesParams("R=0.3Ω、cosθ=0.8…", [0.3, 0.8])).toBe(true);
  });

  it("パラメータが空なら常に true", () => {
    expect(statementMatchesParams("任意の文", [])).toBe(true);
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
