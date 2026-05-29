import { describe, expect, it } from "vitest";
import { ingest, type RawPastExam } from "../../lib/ingest/ingest.js";

describe("過去問取込（04）", () => {
  it("出典メタ欠落データは取込エラー（rejected）になる", () => {
    const raws: RawPastExam[] = [
      { examType: "第二種 一次", subject: "理論", statement: "問題A" }, // year欠落
      { year: "令和5年度", subject: "理論", statement: "問題B" }, // examType欠落
      { year: "令和5年度", examType: "第二種 一次", statement: "問題C" }, // subject欠落
    ];
    const r = ingest(raws);
    expect(r.accepted.length).toBe(0);
    expect(r.rejected.length).toBe(3);
    expect(r.rejected[0]!.reason).toContain("year");
  });

  it("受理データは past_exam_quoted で出典付与され、生成問題と分離される", () => {
    const r = ingest([{ year: "令和5年度", examType: "第二種 一次", subject: "機械", statement: "誘導機の問題" }]);
    expect(r.accepted.length).toBe(1);
    expect(r.accepted[0]!.sourceType).toBe("past_exam_quoted");
    expect(r.accepted[0]!.citation).toContain("令和5年度");
  });

  it("数式/図を含む問題に要手修正フラグが立つ", () => {
    const r = ingest([
      { year: "令和5年度", examType: "二次", subject: "電力管理", statement: "回路図参照", figureRef: "fig1.png" },
      { year: "令和5年度", examType: "二次", subject: "機械制御", statement: "数式あり", hasMathPlaceholder: true },
    ]);
    expect(r.manualFixCount).toBe(2);
    expect(r.accepted.every((a) => a.needsManualFix)).toBe(true);
  });

  it("重複が検出・スキップされる", () => {
    const dup: RawPastExam = { year: "令和5年度", examType: "一次", subject: "理論", statement: "同じ問題文" };
    const r = ingest([dup, { ...dup }]);
    expect(r.accepted.length).toBe(1);
    expect(r.duplicates).toBe(1);
  });
});
