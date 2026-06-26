/**
 * Supabase アダプタの行⇔ドメイン マッピング（純関数）の往復テスト。
 * 実 DB I/O は認証が要るため対象外。マッピングの正しさだけをここで担保する。
 */
import { describe, expect, it } from "vitest";
import type { Problem } from "../../lib/engine/schema.js";
import type { ReviewState } from "../../lib/scheduler/types.js";
import { problemToRow, reviewStateToRow, rowToProblem, rowToReviewState } from "../../lib/store/supabase-store.js";
import { loadProblemFixture } from "../helpers/fixtures.js";

const T0001 = loadProblemFixture("T-0001");

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
});
