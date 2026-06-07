/**
 * Supabase アダプタの行⇔ドメイン マッピング（純関数）の往復テスト。
 * 実 DB I/O は認証が要るため対象外。マッピングの正しさだけをここで担保する。
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { Problem } from "../../lib/engine/schema.js";
import type { ReviewState } from "../../lib/scheduler/types.js";
import { problemToRow, reviewStateToRow, rowToProblem, rowToReviewState } from "../../lib/store/supabase-store.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const T0001: Problem = JSON.parse(readFileSync(join(__dirname, "../../data/problems/T-0001.json"), "utf8"));

describe("Supabase row mappers", () => {
  it("Problem ⇔ row 往復で内容が保たれる", () => {
    const back = rowToProblem(problemToRow(T0001));
    expect(back.id).toBe("T-0001");
    expect(back.answer).toBe("3.2");
    expect(back.choices).toEqual(["2.56", "3.2", "4.0", "9.6"]);
    expect(back.status).toBe("validated");
    expect(back.source.type).toBe("original");
  });

  it("numeric 問題（choices なし）も往復できる", () => {
    const numeric: Problem = { ...T0001, id: "N", format: "numeric", choices: undefined, answer: "50" };
    const row = problemToRow(numeric);
    expect(row.choices).toBeNull();
    expect(rowToProblem(row).choices).toBeUndefined();
  });

  it("params を往復で保持する（STORE-1: Supabase が params を捨てて parity が崩れていた）", () => {
    expect(T0001.params).toBeTruthy();
    const row = problemToRow(T0001);
    expect(row.params).toEqual(T0001.params);
    expect(rowToProblem(row).params).toEqual(T0001.params);
  });

  it("params なしの問題は row が null・往復でキーが付かない", () => {
    const noParams: Problem = { ...T0001, id: "NP", params: undefined };
    const row = problemToRow(noParams);
    expect(row.params).toBeNull();
    expect("params" in rowToProblem(row)).toBe(false);
  });

  it("ReviewState ⇔ row 往復（due/last の epoch↔ISO 変換）", () => {
    const st: ReviewState = {
      reps: 2,
      lapses: 1,
      intervalDays: 6,
      ease: 2.5,
      dueMs: Date.UTC(2026, 0, 10),
      lastReviewMs: Date.UTC(2026, 0, 4),
    };
    const back = rowToReviewState(reviewStateToRow("u1", "三相交流電力", st));
    expect(back).toEqual(st);
  });

  it("lastReviewMs=null を保持する", () => {
    const st: ReviewState = { reps: 0, lapses: 0, intervalDays: 0, ease: 2.5, dueMs: 0, lastReviewMs: null };
    expect(rowToReviewState(reviewStateToRow("u1", "t", st)).lastReviewMs).toBeNull();
  });

  it("FSRS の stability/difficulty を往復で保持する（列はあるのに mapping で欠落していた）", () => {
    const st: ReviewState = {
      reps: 3,
      lapses: 1,
      intervalDays: 12,
      ease: 2.5,
      dueMs: Date.UTC(2026, 1, 1),
      lastReviewMs: Date.UTC(2026, 0, 20),
      stability: 12.34,
      difficulty: 5.67,
    };
    const row = reviewStateToRow("u1", "三相交流電力", st);
    expect(row.stability).toBe(12.34);
    expect(row.difficulty).toBe(5.67);
    expect(rowToReviewState(row)).toEqual(st);
  });

  it("SM-2（FSRS 非使用）は row が null・往復でキーが付かない（後方互換）", () => {
    const st: ReviewState = { reps: 1, lapses: 0, intervalDays: 1, ease: 2.5, dueMs: 0, lastReviewMs: null };
    const row = reviewStateToRow("u1", "t", st);
    expect(row.stability).toBeNull();
    expect(row.difficulty).toBeNull();
    const back = rowToReviewState(row);
    expect("stability" in back).toBe(false);
    expect("difficulty" in back).toBe(false);
  });
});
