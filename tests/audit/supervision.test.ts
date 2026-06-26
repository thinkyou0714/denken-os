import { describe, expect, it } from "vitest";
import {
  formatSupervisionReport,
  markSupervisedInJson,
  supervisionReport,
  supervisionStage,
} from "../../lib/audit/supervision.js";
import type { Problem } from "../../lib/engine/schema.js";
import { loadProblemFixture } from "../helpers/fixtures.js";

const BASE = loadProblemFixture("T-0001"); // validated・supervisor_checked=false

/** BASE を土台に validation/status/subject/topic/id を差し替える。 */
function mk(over: Omit<Partial<Problem>, "validation"> & { validation?: Partial<Problem["validation"]> }): Problem {
  return {
    ...BASE,
    ...over,
    validation: { ...BASE.validation, ...(over.validation ?? {}) },
  } as Problem;
}

describe("supervisionStage", () => {
  it("supervisor_checked=true は supervised", () => {
    expect(supervisionStage(mk({ validation: { supervisor_checked: true } }))).toBe("supervised");
  });

  it("validated・検証4項目 true・未監修は needs_supervision", () => {
    expect(supervisionStage(mk({ status: "validated", validation: { supervisor_checked: false } }))).toBe(
      "needs_supervision",
    );
  });

  it("draft は needs_validation", () => {
    expect(supervisionStage(mk({ status: "draft", validation: { human_checked: false } }))).toBe("needs_validation");
  });

  it("status は validated でも検証4項目が欠ければ needs_validation", () => {
    expect(supervisionStage(mk({ status: "validated", validation: { solver_checked: false } }))).toBe(
      "needs_validation",
    );
  });
});

describe("supervisionReport", () => {
  const problems: Problem[] = [
    mk({ id: "T-0002", subject: "理論", topic: "三相交流電力", validation: { supervisor_checked: true } }),
    mk({ id: "T-0001", subject: "理論", topic: "三相交流電力", validation: { supervisor_checked: false } }),
    mk({ id: "T-0003", subject: "機械", topic: "誘導電動機", validation: { supervisor_checked: false } }),
    mk({ id: "T-0004", subject: "機械", topic: "誘導電動機", status: "draft", validation: { human_checked: false } }),
  ];
  const r = supervisionReport(problems);

  it("総数・監修済み・待ち・要検証を集計する", () => {
    expect(r.total).toBe(4);
    expect(r.supervised).toBe(1);
    expect(r.needsSupervision).toBe(2);
    expect(r.needsValidation).toBe(1);
  });

  it("カバレッジ率 = supervised/total", () => {
    expect(r.coverage).toBeCloseTo(0.25, 5);
  });

  it("reviewQueue は needs_supervision のみ・id 昇順", () => {
    expect(r.reviewQueue.map((q) => q.id)).toEqual(["T-0001", "T-0003"]);
  });

  it("科目別: 論点カバレッジ（監修済み問題が1件以上ある論点）を数える", () => {
    const riron = r.bySubject.find((s) => s.subject === "理論")!;
    expect(riron.topicsTotal).toBe(1);
    expect(riron.topicsSupervised).toBe(1); // 三相交流電力に監修済み(T-0002)あり
    const kikai = r.bySubject.find((s) => s.subject === "機械")!;
    expect(kikai.topicsTotal).toBe(1);
    expect(kikai.topicsSupervised).toBe(0); // 誘導電動機に監修済みなし
  });

  it("空集合では coverage=0・キュー空", () => {
    const empty = supervisionReport([]);
    expect(empty.total).toBe(0);
    expect(empty.coverage).toBe(0);
    expect(empty.reviewQueue).toHaveLength(0);
  });

  it("formatSupervisionReport は主要指標を含む", () => {
    const text = formatSupervisionReport(r);
    expect(text).toContain("監修カバレッジ");
    expect(text).toContain("1/4");
    expect(text).toContain("理論");
  });
});

describe("markSupervisedInJson", () => {
  it("false を true に書き換える（marked）", () => {
    const src = '{\n  "validation": { "supervisor_checked": false }\n}';
    const r = markSupervisedInJson(src);
    expect(r.outcome).toBe("marked");
    expect(r.text).toContain('"supervisor_checked": true');
    expect(r.text).not.toContain("false");
  });

  it("対象キー以外の整形・内容を一切変えない", () => {
    const src =
      '{\n  "id": "T-0001",\n  "validation": {\n    "human_checked": true,\n    "supervisor_checked": false\n  }\n}';
    const r = markSupervisedInJson(src);
    // supervisor_checked の値だけが変わり、それ以外はバイト単位で一致する。
    expect(r.text).toBe(src.replace('"supervisor_checked": false', '"supervisor_checked": true'));
    // 構造として妥当な JSON のまま。
    expect(JSON.parse(r.text).validation.human_checked).toBe(true);
  });

  it("既に true なら変更なし（already_supervised）", () => {
    const src = '{ "validation": { "supervisor_checked": true } }';
    const r = markSupervisedInJson(src);
    expect(r.outcome).toBe("already_supervised");
    expect(r.text).toBe(src);
  });

  it("フィールドが無ければ field_missing", () => {
    const src = '{ "validation": { "human_checked": true } }';
    const r = markSupervisedInJson(src);
    expect(r.outcome).toBe("field_missing");
    expect(r.text).toBe(src);
  });
});
