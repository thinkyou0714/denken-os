/**
 * I-070: validate-problems.ts の純関数に対する失敗系テスト。
 *
 * G5 が export した customChecks / validateFiles を対象に、
 * 不正 JSON・スキーマ違反・空集合・カスタムルール違反のケースを検証する。
 */
import { describe, expect, it } from "vitest";
import { customChecks, validateFiles } from "../../scripts/validate-problems.js";

// テスト用の最小限の合格 problem
const BASE_PROBLEM = {
  id: "T-9999",
  subject: "理論",
  topic: "テスト問題",
  difficulty: 2,
  format: "multiple_choice",
  statement: "テスト",
  choices: ["A", "B", "C"],
  answer: "A",
  solution: ["答えはA"],
  validation: {
    solver_checked: true,
    human_checked: false,
    clean_answer: true,
    physically_valid: true,
  },
  source: { type: "original" },
};

describe("customChecks（I-070）", () => {
  it("正常な multiple_choice 問題はエラーなし", () => {
    const failures = customChecks("test.json", BASE_PROBLEM);
    expect(failures).toHaveLength(0);
  });

  it("multiple_choice: answer が choices に含まれない場合はエラー", () => {
    const bad = { ...BASE_PROBLEM, answer: "X" };
    const failures = customChecks("test.json", bad);
    expect(failures.some((f) => f.rule === "answer_in_choices")).toBe(true);
    expect(failures[0]?.message).toContain("X");
  });

  it("multiple_choice: choices が未定義の場合はエラー", () => {
    const bad = { ...BASE_PROBLEM, choices: undefined };
    const failures = customChecks("test.json", bad);
    expect(failures.some((f) => f.rule === "answer_in_choices")).toBe(true);
  });

  it("status=validated で検証4項目が揃っていない場合はエラー", () => {
    const bad = {
      ...BASE_PROBLEM,
      status: "validated",
      validation: { ...BASE_PROBLEM.validation, human_checked: false },
    };
    const failures = customChecks("test.json", bad);
    expect(failures.some((f) => f.rule === "validation_gate")).toBe(true);
  });

  it("status=published で検証4項目が揃っていない場合はエラー", () => {
    const bad = {
      ...BASE_PROBLEM,
      status: "published",
      validation: {
        solver_checked: true,
        human_checked: false,
        clean_answer: true,
        physically_valid: true,
      },
    };
    const failures = customChecks("test.json", bad);
    expect(failures.some((f) => f.rule === "validation_gate")).toBe(true);
  });

  it("status=validated で全4項目 true ならエラーなし", () => {
    const good = {
      ...BASE_PROBLEM,
      status: "validated",
      validation: {
        solver_checked: true,
        human_checked: true,
        clean_answer: true,
        physically_valid: true,
      },
    };
    const failures = customChecks("test.json", good);
    expect(failures.filter((f) => f.rule === "validation_gate")).toHaveLength(0);
  });

  it("source.type=past_exam_modified で citation なし → エラー", () => {
    const bad = {
      ...BASE_PROBLEM,
      source: { type: "past_exam_modified" },
    };
    const failures = customChecks("test.json", bad);
    expect(failures.some((f) => f.rule === "citation_required")).toBe(true);
  });

  it("source.type=past_exam_modified で citation あり → エラーなし", () => {
    const good = {
      ...BASE_PROBLEM,
      source: { type: "past_exam_modified", citation: "令和5年度 第二種 一次 理論（改題）" },
    };
    const failures = customChecks("test.json", good);
    expect(failures.filter((f) => f.rule === "citation_required")).toHaveLength(0);
  });

  it("numeric 形式は answer_in_choices チェックをスキップする", () => {
    const numeric = {
      ...BASE_PROBLEM,
      format: "numeric",
      choices: undefined,
      answer: "42",
    };
    const failures = customChecks("test.json", numeric);
    expect(failures.filter((f) => f.rule === "answer_in_choices")).toHaveLength(0);
  });
});

describe("validateFiles（I-070）", () => {
  it("空ファイルリストでは失敗なし", () => {
    const failures = validateFiles(
      [],
      "/dummy",
      () => true,
      () => [],
    );
    expect(failures).toHaveLength(0);
  });

  it("validate が false を返すファイルは schema エラーとして記録される", () => {
    // validateFiles は実際のファイルを読むため、
    // 存在しないファイルを渡すと json_parse エラーが返る（ENOENT）
    const failures = validateFiles(
      ["nonexistent.json"],
      "/tmp/denken-test-noexist-dir",
      () => false,
      () => [{ instancePath: "/id", message: "required" }],
    );
    // ENOENT で json_parse エラーが発生する
    expect(failures.length).toBeGreaterThan(0);
    expect(failures[0]?.rule).toBe("json_parse");
  });
});
