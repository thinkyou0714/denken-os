import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { narrationMatchesAnswer, narrationPreservesGivens, validateProblem } from "../../lib/engine/validate.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const T0001 = JSON.parse(readFileSync(join(__dirname, "../../data/problems/T-0001.json"), "utf8"));

describe("validateProblem", () => {
  it("検証済みサンプル T-0001 を通す", () => {
    const r = validateProblem(T0001);
    expect(r.ok).toBe(true);
  });

  it("answer ∉ choices を弾く（answer_in_choices）", () => {
    const bad = { ...T0001, answer: "5.5" }; // choices に無い
    const r = validateProblem(bad);
    expect(r.ok).toBe(false);
    expect(r.issues.some((i) => i.rule === "answer_in_choices")).toBe(true);
  });

  it("検証4項目いずれか false のとき status=validated を弾く（schema gate）", () => {
    const bad = {
      ...T0001,
      validation: { ...T0001.validation, human_checked: false },
      status: "validated",
    };
    const r = validateProblem(bad);
    expect(r.ok).toBe(false);
    expect(r.issues.some((i) => i.rule === "schema")).toBe(true);
  });

  it("original 以外で citation 欠落を弾く", () => {
    const bad = { ...T0001, source: { type: "past_exam_modified" } };
    const r = validateProblem(bad);
    expect(r.ok).toBe(false);
  });
});

describe("narrationMatchesAnswer（解説の数値整合）", () => {
  it("数値の答え: 解説のどこかに想定値が現れれば一致", () => {
    expect(narrationMatchesAnswer(["|Z|=10", "P=3·I²·R=3.2kW", "別解…"], "3.2")).toBe(true);
    expect(narrationMatchesAnswer(["3200W=3.2kW"], "3.2")).toBe(true);
  });

  it("想定値が現れなければ不一致（ハルシネーション破棄）", () => {
    expect(narrationMatchesAnswer(["（途中式省略）", "P=999999kW"], "3.2")).toBe(false);
  });

  it("非数値の答え: 最終ステップに答え文字列が含まれることを要求", () => {
    expect(narrationMatchesAnswer(["導出…", "よって 遅れ力率"], "遅れ力率")).toBe(true);
    expect(narrationMatchesAnswer(["導出…"], "遅れ力率")).toBe(false);
  });

  // F1/DI-1: 途中に正解値が現れても、結論の最終値が誤りなら破棄する（アンカーを最終値に）。
  it("正解値が途中に出ても最終値が誤りなら不一致（最終値アンカー）", () => {
    expect(narrationMatchesAnswer(["P=3.2kW を計算", "最終 P=9.6kW"], "3.2")).toBe(false);
  });

  it("変圧器 cos=1.0 系の偽陽性: 入力 p が =p×… に出ても最終を誤れば破棄", () => {
    // 入力 p=4 が中間式 ε≈p·cosθ+…=4×1+10×0 に現れるが、最終 ε=9% は誤り → false。
    expect(narrationMatchesAnswer(["ε≈p·cosθ+q·sinθ=4×1+10×0", "ε=9%"], "4")).toBe(false);
    // 正しい結論 ε=4% なら true。
    expect(narrationMatchesAnswer(["ε≈p·cosθ+q·sinθ=4×1+10×0", "ε=4%"], "4")).toBe(true);
  });

  // DI-2: 非数値経路の部分文字列誤マッチを語境界で防ぐ。
  it("非数値: '4.6' が '14.65' に誤マッチしない（語境界）", () => {
    expect(narrationMatchesAnswer(["残差は14.65である"], "4.6")).toBe(false);
    expect(narrationMatchesAnswer(["ε=4.6 と求まる"], "4.6")).toBe(true);
  });

  // F1 強化: 単位に / や · を含む 電験単位（m/s, rad/s, A/m, N·m）でも最終値アンカーが効く。
  // 「単位の演算子」を計算式と誤認すると弱い全走査に落ち、最終値が誤りでも中間の正解値で通ってしまう。
  it("単位に演算子を含む最終値でもアンカーが機能する（m/s・N·m 等）", () => {
    // 最終値8（誤り）。中間に正解5が出るが、最終値アンカーが効けば破棄される。
    expect(narrationMatchesAnswer(["v=5 m/s で計算", "最終 v=8 m/s"], "5")).toBe(false);
    expect(narrationMatchesAnswer(["v=5 m/s で計算", "最終 v=8 m/s"], "8")).toBe(true);
    // 単一ステップの結果値（単位に / · あり）は素直に一致。
    expect(narrationMatchesAnswer(["T=9.55·P/N=12 N·m"], "12")).toBe(true);
    expect(narrationMatchesAnswer(["ω=2πf=314 rad/s"], "314")).toBe(true);
  });
});

describe("narrationPreservesGivens（言い換えが与件の数値を保存するか）", () => {
  const base = "設備容量が100kW、最大需要電力が75kWである。需要率〔%〕を求めよ。";

  it("既定文の全数値が言い換え後にもあれば保存とみなす", () => {
    expect(narrationPreservesGivens(base, "需要率を求めよ。設備容量は100kW、最大需要は75kWだ。")).toBe(true);
  });

  it("与件の数値を改ざんすると不保存（100→120）", () => {
    expect(narrationPreservesGivens(base, "設備容量が120kW、最大需要電力が75kWである。")).toBe(false);
  });

  it("与件の数値を欠落させると不保存（75 が消える）", () => {
    expect(narrationPreservesGivens(base, "設備容量が100kWである需要家。")).toBe(false);
  });

  it("数字の一部一致を保存と誤認しない（100 が 1000 に化けても不保存）", () => {
    expect(narrationPreservesGivens(base, "設備容量が1000kW、最大需要電力が75kWである。")).toBe(false);
  });

  it("数値の無い既定文は常に保存（自由言い換え可）", () => {
    expect(narrationPreservesGivens("力率の意味を答えよ。", "力率とは何か説明せよ。")).toBe(true);
  });
});
