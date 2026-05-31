/**
 * シラバス被覆の不変条件（13-best-practices §E）。
 *  - 全6科目を最低限カバーしている（退行防止の床）。
 *  - テンプレート topic はすべてシラバスに登録済み（孤児 topic を作らない）。
 *  - 6科目すべてに 1 つ以上の covered 論点がある。
 */
import { describe, expect, it } from "vitest";
import type { Subject } from "../../lib/engine/schema.js";
import { computeCoverage, SYLLABUS } from "../../lib/engine/syllabus.js";
import { listTopics } from "../../lib/engine/templates/index.js";

const MIN_BY_SUBJECT: Record<Subject, number> = {
  理論: 18,
  電力: 13,
  機械: 14,
  法規: 9,
  機械制御: 3,
  電力管理: 5,
};

describe("シラバス被覆", () => {
  it("テンプレート topic はすべてシラバスに登録されている（孤児topicなし）", () => {
    const syllabusTopics = new Set(SYLLABUS.map((e) => e.topic));
    const orphans = listTopics().filter((t) => !syllabusTopics.has(t));
    expect(orphans).toEqual([]);
  });

  it("6科目すべてが最小被覆を満たす", () => {
    const report = computeCoverage(listTopics());
    expect(report.bySubject.length).toBe(6);
    for (const s of report.bySubject) {
      expect(s.covered, `${s.subject} の被覆`).toBeGreaterThanOrEqual(MIN_BY_SUBJECT[s.subject]);
    }
  });

  it("二次（電力管理・機械制御）も covered 論点を持つ", () => {
    const report = computeCoverage(listTopics());
    const secondary = report.bySubject.filter((s) => s.subject === "電力管理" || s.subject === "機械制御");
    expect(secondary.length).toBe(2);
    for (const s of secondary) expect(s.covered).toBeGreaterThanOrEqual(1);
  });

  it("computeCoverage の比率は covered/total と一致する", () => {
    const report = computeCoverage(["三相交流電力", "需要率"]);
    for (const s of report.bySubject) {
      expect(s.ratio).toBeCloseTo(s.total === 0 ? 0 : s.covered / s.total, 6);
    }
    expect(report.covered).toBe(2);
  });
});
