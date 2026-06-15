/**
 * tests/supabase/rls-mock.test.ts
 * RLS ポリシーのモック検証テスト（RG7）。
 * 実際の Supabase DB なしにポリシーロジックを純関数として検証する。
 */
import { describe, expect, it } from "vitest";

// RLS ポリシーの純関数モデル
// 各ポリシーは (auth_uid, row_user_id) => boolean の形式

// answer_logs ポリシー
const answerLogsSelectPolicy = (authUid: string | null, rowUserId: string) => authUid !== null && authUid === rowUserId;

const answerLogsInsertPolicy = (authUid: string | null, rowUserId: string) => authUid !== null && authUid === rowUserId;

const answerLogsUpdatePolicy = (authUid: string | null, rowUserId: string) => authUid !== null && authUid === rowUserId;

const answerLogsDeletePolicy = (authUid: string | null, rowUserId: string) => authUid !== null && authUid === rowUserId;

// review_states ポリシー
const reviewStatesSelectPolicy = (authUid: string | null, rowUserId: string) =>
  authUid !== null && authUid === rowUserId;

const reviewStatesInsertPolicy = (authUid: string | null, rowUserId: string) =>
  authUid !== null && authUid === rowUserId;

const reviewStatesUpdatePolicy = (authUid: string | null, rowUserId: string) =>
  authUid !== null && authUid === rowUserId;

const reviewStatesDeletePolicy = (authUid: string | null, rowUserId: string) =>
  authUid !== null && authUid === rowUserId;

describe("RLS モック: answer_logs", () => {
  const USER_A = "uid-aaa";
  const USER_B = "uid-bbb";

  it("自分のレコードは SELECT できる", () => {
    expect(answerLogsSelectPolicy(USER_A, USER_A)).toBe(true);
  });

  it("他人のレコードは SELECT できない", () => {
    expect(answerLogsSelectPolicy(USER_A, USER_B)).toBe(false);
  });

  it("未認証では SELECT できない", () => {
    expect(answerLogsSelectPolicy(null, USER_A)).toBe(false);
  });

  it("自分のレコードは INSERT できる", () => {
    expect(answerLogsInsertPolicy(USER_A, USER_A)).toBe(true);
  });

  it("他人名義での INSERT はできない", () => {
    expect(answerLogsInsertPolicy(USER_A, USER_B)).toBe(false);
  });

  it("自分のレコードは UPDATE できる（0004 で追加）", () => {
    expect(answerLogsUpdatePolicy(USER_A, USER_A)).toBe(true);
  });

  it("他人のレコードは UPDATE できない（0004 で追加）", () => {
    expect(answerLogsUpdatePolicy(USER_A, USER_B)).toBe(false);
  });

  it("自分のレコードは DELETE できる（0004 で追加）", () => {
    expect(answerLogsDeletePolicy(USER_A, USER_A)).toBe(true);
  });

  it("他人のレコードは DELETE できない（0004 で追加）", () => {
    expect(answerLogsDeletePolicy(USER_A, USER_B)).toBe(false);
  });
});

describe("RLS モック: review_states", () => {
  const USER_A = "uid-ccc";
  const USER_B = "uid-ddd";

  it("自分の review_state は SELECT できる", () => {
    expect(reviewStatesSelectPolicy(USER_A, USER_A)).toBe(true);
  });

  it("他人の review_state は SELECT できない", () => {
    expect(reviewStatesSelectPolicy(USER_A, USER_B)).toBe(false);
  });

  it("未認証では review_state を SELECT できない", () => {
    expect(reviewStatesSelectPolicy(null, USER_A)).toBe(false);
  });

  it("自分の review_state は INSERT できる", () => {
    expect(reviewStatesInsertPolicy(USER_A, USER_A)).toBe(true);
  });

  it("自分の review_state は UPDATE できる", () => {
    expect(reviewStatesUpdatePolicy(USER_A, USER_A)).toBe(true);
  });

  it("他人の review_state は UPDATE できない", () => {
    expect(reviewStatesUpdatePolicy(USER_A, USER_B)).toBe(false);
  });

  it("自分の review_state は DELETE できる（0004 で追加）", () => {
    expect(reviewStatesDeletePolicy(USER_A, USER_A)).toBe(true);
  });

  it("他人の review_state は DELETE できない（0004 で追加）", () => {
    expect(reviewStatesDeletePolicy(USER_A, USER_B)).toBe(false);
  });
});

describe("difficulty NOT NULL バリデーション（0004 制約のモデル）", () => {
  interface ReviewState {
    reps: number;
    difficulty: number; // 0004 以降 NOT NULL
    ease: number;
  }

  const validateReviewState = (s: Partial<ReviewState>): boolean => {
    return s.difficulty !== undefined && s.difficulty !== null && Number.isFinite(s.difficulty);
  };

  it("difficulty が設定されている場合は有効", () => {
    expect(validateReviewState({ reps: 1, difficulty: 5.17, ease: 2.5 })).toBe(true);
  });

  it("difficulty が undefined の場合は無効（NOT NULL 違反）", () => {
    expect(validateReviewState({ reps: 1, ease: 2.5 })).toBe(false);
  });

  it("FSRS デフォルト値 5.17 は有効な difficulty", () => {
    expect(validateReviewState({ difficulty: 5.17 })).toBe(true);
  });

  it("difficulty が NaN の場合は無効", () => {
    expect(validateReviewState({ difficulty: Number.NaN })).toBe(false);
  });
});
