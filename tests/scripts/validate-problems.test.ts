/**
 * I-070: validate-problems.ts の純関数に対する失敗系テスト。
 *
 * G5 が export した customChecks / validateFiles を対象に、
 * 不正 JSON・スキーマ違反・空集合・カスタムルール違反のケースを検証する。
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { validateProblem } from "../../lib/engine/validate.js";
import { customChecks, EXPECTED_MIN_FILES, minFilesGate, validateFiles } from "../../scripts/validate-problems.js";
import { makeProblemFixture, withTempDir } from "../helpers/fixtures.js";

// テスト用の最小限の合格 problem
const BASE_PROBLEM = makeProblemFixture();

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

  it("multiple_choice: choices 未定義（構造不備）は customChecks の不変条件層では出さない（PAR-01: ajv/zod スキーマ層が担当）", () => {
    // 不変条件チェック（answer ∈ choices / clean_answer）は構造妥当なデータにのみ適用し、
    // zod 経路（validateProblem）と挙動を揃える。choices 欠落は schema エラーとして
    // validateFiles 経路の ajv が別途検出する。
    const bad = { ...BASE_PROBLEM, choices: undefined };
    const failures = customChecks("test.json", bad);
    expect(failures.filter((f) => f.rule === "answer_in_choices")).toHaveLength(0);
  });

  it("PAR-01: CI 経路（customChecks）と zod 経路（validateProblem）が同じ不変条件を強制する", () => {
    // 構造は妥当だが answer が choices に無い → 両経路とも answer_in_choices を出す。
    const badChoice = { ...BASE_PROBLEM, answer: "X" };
    expect(customChecks("test.json", badChoice).some((f) => f.rule === "answer_in_choices")).toBe(
      validateProblem(badChoice).issues.some((i) => i.rule === "answer_in_choices"),
    );
    // clean_answer=true で answer が綺麗でない numeric 問題 → 両経路の判定が一致する
    // （以前は CI 経路が clean_answer を見ておらず乖離していた）。
    const dirtyClean = { ...BASE_PROBLEM, format: "numeric", choices: undefined, answer: "0.3333333333" };
    expect(customChecks("test.json", dirtyClean).some((f) => f.rule === "clean_answer")).toBe(
      validateProblem(dirtyClean).issues.some((i) => i.rule === "clean_answer"),
    );
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

  it("null や primitive は throw せず schema 層に任せる", () => {
    expect(() => customChecks("null.json", null)).not.toThrow();
    expect(() => customChecks("num.json", 1)).not.toThrow();
    expect(customChecks("null.json", null)).toHaveLength(0);
  });

  it("validation/source が object でなくても安全に扱う", () => {
    const gateFailures = customChecks("test.json", { status: "published", validation: null });
    expect(gateFailures.some((f) => f.rule === "validation_gate")).toBe(true);
    expect(() => customChecks("test.json", { source: null })).not.toThrow();
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

  it("存在しないファイルは json_parse エラーとして記録される", () => {
    withTempDir("denken-test-validate-problems-missing", (dir) => {
      const failures = validateFiles(
        ["missing.json"],
        dir,
        () => true,
        () => [],
      );

      expect(failures).toHaveLength(1);
      expect(failures[0]?.rule).toBe("json_parse");
    });
  });

  it("不正 JSON ファイルは json_parse エラーとして記録される", () => {
    withTempDir("denken-test-validate-problems-json", (dir) => {
      writeFileSync(join(dir, "bad.json"), "{oops}", "utf8");

      const failures = validateFiles(
        ["bad.json"],
        dir,
        () => true,
        () => [],
      );

      expect(failures).toHaveLength(1);
      expect(failures[0]?.rule).toBe("json_parse");
    });
  });

  it("validate が false を返す既存ファイルは schema エラーとして記録される", () => {
    withTempDir("denken-test-validate-problems-schema", (dir) => {
      writeFileSync(join(dir, "bad.json"), JSON.stringify({ id: "bad" }), "utf8");

      const failures = validateFiles(
        ["bad.json"],
        dir,
        () => false,
        () => [{ instancePath: "/subject", message: "required" }],
      );

      expect(failures).toHaveLength(1);
      expect(failures[0]?.rule).toBe("schema");
      expect(failures[0]?.message).toContain("/subject required");
    });
  });
});

describe("minFilesGate（下限ゲートの失敗パスを明示検証・RT1）", () => {
  it("下限ちょうど（52件）は通過する（null を返す）", () => {
    expect(minFilesGate(EXPECTED_MIN_FILES)).toBeNull();
  });

  it("下限を1件下回る（51件）と非null のエラーメッセージで CI を止める", () => {
    const err = minFilesGate(EXPECTED_MIN_FILES - 1);
    expect(err).not.toBeNull();
    expect(err).toContain("51");
    expect(err).toContain(String(EXPECTED_MIN_FILES));
  });

  it("0件（全削除）も確実に弾く", () => {
    expect(minFilesGate(0)).not.toBeNull();
  });

  it("下限を上回る（新規追加）件数は通過する", () => {
    expect(minFilesGate(EXPECTED_MIN_FILES + 100)).toBeNull();
  });

  it("EXPECTED_MIN_FILES は実データ件数（52）に一致する", () => {
    // データを削っても閾値だけ下げて偽グリーン化する事故を防ぐ回帰ピン。
    expect(EXPECTED_MIN_FILES).toBe(52);
  });
});
