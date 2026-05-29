import { describe, expect, it } from "vitest";
import { canPublish, decideStatus, meetsValidationGate, requiresSupervision } from "../../lib/engine/gate.js";
import type { Problem } from "../../lib/engine/schema.js";

const base: Problem = {
  id: "G-1",
  exam: "denken3",
  subject: "理論",
  topic: "抵抗の消費電力",
  format: "multiple_choice",
  difficulty: 2,
  statement: "x",
  choices: ["1", "2"],
  answer: "1",
  solution: ["s"],
  validation: { solver_checked: true, human_checked: true, clean_answer: true, physically_valid: true },
  source: { type: "original", citation: "t" },
} as Problem;

describe("meetsValidationGate", () => {
  it("4項目すべて true で通過", () => {
    expect(meetsValidationGate(base.validation)).toBe(true);
  });
  it("1つでも false なら不通過", () => {
    expect(meetsValidationGate({ ...base.validation, human_checked: false })).toBe(false);
  });
});

describe("requiresSupervision — 監修必須の判定", () => {
  it("二種二次の記述は監修必須", () => {
    const p = { ...base, exam: "denken2_secondary", subject: "機械制御", format: "descriptive" } as Problem;
    expect(requiresSupervision(p)).toBe(true);
  });
  it("difficulty>=4 は監修必須", () => {
    expect(requiresSupervision({ ...base, difficulty: 4 } as Problem)).toBe(true);
  });
  it("過去問引用は監修必須", () => {
    const p = { ...base, source: { type: "past_exam_quoted", citation: "令和5 三種" } } as Problem;
    expect(requiresSupervision(p)).toBe(true);
  });
  it("通常の三種・易問は監修不要", () => {
    expect(requiresSupervision(base)).toBe(false);
  });
});

describe("canPublish — 公開の最終ゲート", () => {
  it("検証4項目＋監修不要なら公開可", () => {
    expect(canPublish(base)).toBe(true);
  });
  it("検証4項目が欠けると公開不可", () => {
    expect(canPublish({ ...base, validation: { ...base.validation, clean_answer: false } } as Problem)).toBe(false);
  });
  it("監修必須なのに supervisor_checked が無いと公開不可", () => {
    const p = { ...base, difficulty: 5 } as Problem;
    expect(canPublish(p)).toBe(false);
  });
  it("監修必須でも supervisor_checked=true なら公開可", () => {
    const p = {
      ...base,
      difficulty: 5,
      validation: { ...base.validation, supervisor_checked: true },
    } as Problem;
    expect(canPublish(p)).toBe(true);
  });
});

describe("decideStatus", () => {
  it("4項目未充足で validated 要求は draft に留まる", () => {
    const v = { ...base.validation, human_checked: false };
    expect(decideStatus(v, "validated")).toBe("draft");
  });
  it("4項目充足なら要求通り昇格", () => {
    expect(decideStatus(base.validation, "validated")).toBe("validated");
  });
});
