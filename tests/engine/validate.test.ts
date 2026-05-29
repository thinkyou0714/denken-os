import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { validateProblem } from "../../lib/engine/validate.js";

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
