/**
 * tests/engine/validate-physics.test.ts
 *
 * RG2: II-114 (validatePhysics) / II-115 (validateProblemSet) / II-121 (checkParamsConsistency) の
 * 新規テスト（既存テスト無変更）。
 */
import { describe, expect, it } from "vitest";
import { checkParamsConsistency, validatePhysics } from "../../lib/engine/generate.js";
import type { Problem } from "../../lib/engine/schema.js";
import type { GenerationResult } from "../../lib/engine/templates/types.js";
import { PARAM_SIMILARITY_THRESHOLD, validateProblem, validateProblemSet } from "../../lib/engine/validate.js";

// --------------------------------------------------------
// validatePhysics（II-114）
// --------------------------------------------------------

const makeDraw = (physicallyValid: boolean): GenerationResult => ({
  format: "multiple_choice",
  params: { R: { value: 8, unit: "ohm" }, X: { value: 6, unit: "ohm" } },
  answerValue: 3.2,
  answerUnit: "kW",
  answerText: "3.2",
  choices: ["2.56", "3.2", "4.0", "9.6"],
  facts: { P: 3200 },
  defaultStatement: "テスト用問題文",
  defaultSolution: ["P=3.2kW"],
  physicallyValid,
});

describe("validatePhysics（II-114）", () => {
  it("draw.physicallyValid=true と problem.physically_valid=true は整合（null を返す）", () => {
    const result = validatePhysics(makeDraw(true), true);
    expect(result).toBeNull();
  });

  it("draw.physicallyValid=false と problem.physically_valid=false は整合（null を返す）", () => {
    const result = validatePhysics(makeDraw(false), false);
    expect(result).toBeNull();
  });

  it("draw=true / problem=false は不整合（理由文字列を返す）", () => {
    const result = validatePhysics(makeDraw(true), false);
    expect(result).not.toBeNull();
    expect(result).toContain("physicallyValid 不一致");
    expect(result).toContain("draw.physicallyValid=true");
    expect(result).toContain("problem.validation.physically_valid=false");
  });

  it("draw=false / problem=true は不整合（理由文字列を返す）", () => {
    const result = validatePhysics(makeDraw(false), true);
    expect(result).not.toBeNull();
    expect(result).toContain("physicallyValid 不一致");
  });
});

// --------------------------------------------------------
// checkParamsConsistency（II-121）
// --------------------------------------------------------

describe("checkParamsConsistency（II-121）", () => {
  const drawParams = {
    R: { value: 8, unit: "ohm" },
    X: { value: 6, unit: "ohm" },
  };

  it("draw.params と problem.params が一致するとき空配列", () => {
    const problemParams: Problem["params"] = {
      R: { value: 8, unit: "ohm", realistic_range: [1, 50] },
      X: { value: 6, unit: "ohm", realistic_range: [1, 50] },
    };
    const draw = { ...makeDraw(true), params: drawParams };
    const issues = checkParamsConsistency(draw, problemParams);
    expect(issues).toHaveLength(0);
  });

  it("draw に存在するキーが problem.params に無い場合は issue を返す", () => {
    const problemParams: Problem["params"] = {
      R: { value: 8, unit: "ohm" },
      // X が欠落
    };
    const draw = { ...makeDraw(true), params: drawParams };
    const issues = checkParamsConsistency(draw, problemParams);
    expect(issues.some((s) => s.includes('"X"'))).toBe(true);
  });

  it("draw の値と problem.params の値が食い違う場合は issue を返す", () => {
    const problemParams: Problem["params"] = {
      R: { value: 10, unit: "ohm" }, // 値が違う
      X: { value: 6, unit: "ohm" },
    };
    const draw = { ...makeDraw(true), params: drawParams };
    const issues = checkParamsConsistency(draw, problemParams);
    expect(issues.some((s) => s.includes('"R"'))).toBe(true);
    expect(issues.some((s) => s.includes("value=8"))).toBe(true);
  });

  it("draw.params が空で problem.params が undefined なら空配列", () => {
    const draw = { ...makeDraw(true), params: {} };
    const issues = checkParamsConsistency(draw, undefined);
    expect(issues).toHaveLength(0);
  });

  it("draw.params にキーがあって problem.params が undefined ならエラー", () => {
    const draw = { ...makeDraw(true), params: drawParams };
    const issues = checkParamsConsistency(draw, undefined);
    expect(issues.length).toBeGreaterThan(0);
  });
});

// --------------------------------------------------------
// validateProblemSet（II-115）
// --------------------------------------------------------

/** テスト用の最小限 Problem を作る。 */
function makeProblem(id: string, topic: string, params: Record<string, number>): Problem {
  const p: unknown = {
    id,
    subject: "理論",
    topic,
    difficulty: 2,
    statement: `テスト問題 ${id}`,
    answer: "3.2",
    choices: ["2.56", "3.2", "4.0", "9.6"],
    format: "multiple_choice",
    solution: ["P=3.2kW"],
    validation: {
      solver_checked: true,
      human_checked: false,
      clean_answer: true,
      physically_valid: true,
    },
    source: { type: "original", citation: "DENKEN-OS オリジナル問題" },
    status: "draft",
    params: Object.fromEntries(Object.entries(params).map(([k, v]) => [k, { value: v, unit: "ohm" }])),
  };
  const result = validateProblem(p);
  if (!result.problem) throw new Error(`makeProblem failed for ${id}: ${JSON.stringify(result.issues)}`);
  return result.problem;
}

describe("validateProblemSet（II-115）", () => {
  it("同一 params の問題ペアを重複検出する", () => {
    const a = makeProblem("A-0001", "三相交流電力", { R: 8, X: 6 });
    const b = makeProblem("A-0002", "三相交流電力", { R: 8, X: 6 });
    const issues = validateProblemSet([a, b]);
    expect(issues.length).toBeGreaterThan(0);
    const first = issues[0];
    expect(first?.rule).toBe("duplicate_params");
    expect(first?.message).toContain("A-0001");
    expect(first?.message).toContain("A-0002");
  });

  it("異なる params なら重複検出しない", () => {
    const a = makeProblem("B-0001", "三相交流電力", { R: 8, X: 6 });
    const b = makeProblem("B-0002", "三相交流電力", { R: 10, X: 8 });
    const issues = validateProblemSet([a, b]);
    expect(issues).toHaveLength(0);
  });

  it("異なる topic の問題は比較対象外", () => {
    const a = makeProblem("C-0001", "三相交流電力", { R: 8, X: 6 });
    const b = makeProblem("C-0002", "直流回路", { R: 8, X: 6 });
    const issues = validateProblemSet([a, b]);
    expect(issues).toHaveLength(0);
  });

  it("params なし（undefined）の問題はスキップ", () => {
    const a = makeProblem("D-0001", "三相交流電力", { R: 8, X: 6 });
    // params を undefined にした問題（問題文のみ）
    const pNoParams: Problem = {
      ...a,
      id: "D-0002",
      params: undefined,
    };
    const issues = validateProblemSet([a, pNoParams]);
    expect(issues).toHaveLength(0);
  });

  it("空のセットは空配列を返す", () => {
    expect(validateProblemSet([])).toHaveLength(0);
  });

  it("PARAM_SIMILARITY_THRESHOLD が export されている", () => {
    expect(typeof PARAM_SIMILARITY_THRESHOLD).toBe("number");
    expect(PARAM_SIMILARITY_THRESHOLD).toBeGreaterThan(0);
  });

  it("カスタム threshold で近似値を検出できる", () => {
    // R: 8 と R: 8.001 — デフォルト閾値(1e-6)では非重複、0.01 閾値では重複
    const a = makeProblem("E-0001", "三相交流電力", { R: 8, X: 6 });
    const b = makeProblem("E-0002", "三相交流電力", { R: 8.001, X: 6 });
    expect(validateProblemSet([a, b])).toHaveLength(0); // デフォルト: 非重複
    expect(validateProblemSet([a, b], 0.01)).toHaveLength(1); // 寛容: 重複検出
  });
});
