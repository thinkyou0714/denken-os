import { describe, expect, it } from "vitest";
import { auditStatus, formatAuditSummary, parseAuditCliOptions } from "../../lib/audit/status.js";
import type { Problem } from "../../lib/engine/schema.js";

function problem(overrides: Partial<Problem> = {}): Problem {
  return {
    id: "A-0001",
    exam: "denken2_primary",
    subject: "理論",
    topic: "三相交流電力",
    format: "multiple_choice",
    difficulty: 2,
    statement: "statement",
    choices: ["1", "2"],
    answer: "1",
    solution: ["solution 1"],
    validation: {
      solver_checked: true,
      human_checked: true,
      clean_answer: true,
      physically_valid: true,
      supervisor_checked: false,
    },
    source: { type: "original", citation: "DENKEN-OS オリジナル問題" },
    status: "validated",
    ...overrides,
  };
}

describe("auditStatus", () => {
  it("問題数・形式・監修状況を集計して不足を推奨する", () => {
    const summary = auditStatus({ problems: [problem()], invalidSchema: 0, testFiles: 26 });

    expect(summary.okForRelease).toBe(false);
    expect(summary.problems.total).toBe(1);
    expect(summary.problems.validated).toBe(1);
    expect(summary.problems.bySubject).toEqual({ 理論: 1 });
    expect(summary.problems.byFormat).toEqual({ multiple_choice: 1 });
    expect(summary.problems.supervisorChecked).toBe(0);
    expect(summary.tests.files).toBe(26);
    expect(summary.recommendations).toContain("validated/published問題は1件です。まず50件を目標に増やしてください。");
    expect(summary.recommendations).toContain(
      "監修済み問題がまだありません。公開ベータ前に監修フローを通してください。",
    );
  });

  it("閾値を満たすと推奨なしを表示できる", () => {
    const problems = Array.from({ length: 2 }, (_, i) =>
      problem({
        id: `A-${String(i + 1).padStart(4, "0")}`,
        format: "descriptive",
        choices: undefined,
        validation: { ...problem().validation, supervisor_checked: true },
      }),
    );
    const summary = auditStatus({
      problems,
      invalidSchema: 0,
      testFiles: 1,
      thresholds: { minValidated: 2, minDescriptive: 2 },
    });

    expect(summary.okForRelease).toBe(true);
    expect(summary.recommendations).toEqual([]);
    expect(formatAuditSummary(summary)).toContain("release-ready: yes");
    expect(formatAuditSummary(summary)).toContain("recommendations: none");
  });

  it("schema不正件数と不正ファイル詳細を推奨と表示に含める", () => {
    const summary = auditStatus({
      problems: [],
      invalidSchema: 1,
      invalidFiles: [{ file: "broken.json", reason: "Unexpected token" }],
      testFiles: 0,
    });

    expect(summary.okForRelease).toBe(false);
    expect(summary.problems.invalidSchema).toBe(1);
    expect(summary.problems.invalidFiles).toEqual([{ file: "broken.json", reason: "Unexpected token" }]);
    expect(summary.recommendations[0]).toBe("1件の問題データがZod schemaを通過していません。");
    expect(formatAuditSummary(summary)).toContain("- broken.json: Unexpected token");
  });
});

describe("parseAuditCliOptions", () => {
  it("json/strictフラグと閾値オプションを解釈する", () => {
    expect(parseAuditCliOptions(["--json", "--strict", "--min-validated=3", "--min-descriptive=1"])).toEqual({
      json: true,
      strict: true,
      thresholds: { minValidated: 3, minDescriptive: 1 },
    });
  });

  it("不正な数値オプションを拒否する", () => {
    expect(() => parseAuditCliOptions(["--min-validated=-1"])).toThrow(
      "--min-validated=<non-negative-integer> を指定してください",
    );
    expect(() => parseAuditCliOptions(["--min-descriptive=1.5"])).toThrow(
      "--min-descriptive=<non-negative-integer> を指定してください",
    );
  });
});
