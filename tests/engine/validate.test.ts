import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { narrationMatchesAnswer, validateProblem } from "../../lib/engine/validate.js";

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
});
