import { describe, expect, it } from "vitest";
import {
  buildCalcDrill,
  CALC_DRILL_KINDS,
  type CalcDrillProblem,
  gradeCalcDrill,
  summarizeCalcDrill,
} from "../../web/src/calc-drill.js";

describe("buildCalcDrill", () => {
  it("count 問を生成する", () => {
    expect(buildCalcDrill(5, 1).length).toBe(5);
    expect(buildCalcDrill(0, 1).length).toBe(0);
  });

  it("seed が同じなら同一セット（決定論的）", () => {
    const a = buildCalcDrill(8, 99);
    const b = buildCalcDrill(8, 99);
    expect(a.map((p) => p.prompt)).toEqual(b.map((p) => p.prompt));
    expect(a.map((p) => p.answer)).toEqual(b.map((p) => p.answer));
  });

  it("seed が違えば（多くの場合）別のセット", () => {
    const a = buildCalcDrill(8, 1).map((p) => p.prompt);
    const b = buildCalcDrill(8, 2).map((p) => p.prompt);
    expect(a).not.toEqual(b);
  });

  it("種別をラウンドロビンで均等に出す", () => {
    const set = buildCalcDrill(CALC_DRILL_KINDS.length, 5);
    expect(set.map((p) => p.kind)).toEqual([...CALC_DRILL_KINDS]);
  });

  it("各問は有限の正解値・正の許容誤差・目標時間を持つ", () => {
    for (const p of buildCalcDrill(20, 3)) {
      expect(Number.isFinite(p.answer)).toBe(true);
      expect(p.tolerance).toBeGreaterThan(0);
      expect(p.targetMs).toBeGreaterThan(0);
    }
  });

  it("生成された問題は自分の正解値で採点すると正解になる", () => {
    for (const p of buildCalcDrill(20, 11)) {
      expect(gradeCalcDrill(p, p.answer)).toBe(true);
    }
  });
});

describe("gradeCalcDrill", () => {
  const prob: CalcDrillProblem = { kind: "sqrt3", prompt: "x", answer: 100, tolerance: 0.02, targetMs: 8000 };

  it("許容誤差内なら正解（±2%）", () => {
    expect(gradeCalcDrill(prob, 100)).toBe(true);
    expect(gradeCalcDrill(prob, 101.9)).toBe(true);
    expect(gradeCalcDrill(prob, 98.1)).toBe(true);
  });

  it("許容誤差外なら不正解", () => {
    expect(gradeCalcDrill(prob, 105)).toBe(false);
    expect(gradeCalcDrill(prob, 90)).toBe(false);
  });

  it("文字列入力・カンマ区切りを受ける", () => {
    expect(gradeCalcDrill({ ...prob, answer: 1000 }, "1,000")).toBe(true);
  });

  it("数値化できなければ不正解", () => {
    expect(gradeCalcDrill(prob, "abc")).toBe(false);
    expect(gradeCalcDrill(prob, "")).toBe(false);
  });

  it("answer=0 は絶対誤差で判定する", () => {
    const zero: CalcDrillProblem = { kind: "percent", prompt: "x", answer: 0, tolerance: 0.01, targetMs: 5000 };
    expect(gradeCalcDrill(zero, 0)).toBe(true);
    expect(gradeCalcDrill(zero, 0.005)).toBe(true);
    expect(gradeCalcDrill(zero, 1)).toBe(false);
  });
});

describe("summarizeCalcDrill", () => {
  const set = buildCalcDrill(4, 1);
  it("正答数・正答率を集計する", () => {
    const r = summarizeCalcDrill(set, [true, false, true, true]);
    expect(r.total).toBe(4);
    expect(r.correct).toBe(3);
    expect(r.accuracyPct).toBe(75);
  });

  it("目標時間内の正解だけ onTime に数える", () => {
    const times = set.map((p) => p.targetMs - 1); // 全問 目標内
    const slow = [...times];
    slow[0] = (set[0]?.targetMs ?? 0) + 1000; // 1問目だけ遅い
    const r = summarizeCalcDrill(set, [true, true, true, true], slow);
    expect(r.onTime).toBe(3); // 1問目は正解だが時間超過で除外
  });

  it("空セットは 0%", () => {
    expect(summarizeCalcDrill([], []).accuracyPct).toBe(0);
  });
});
