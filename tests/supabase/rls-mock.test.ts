/**
 * tests/supabase/rls-mock.test.ts
 * RLS ポリシーのモック検証テスト（RG7）。
 * 実際の Supabase DB なしにポリシーロジックを純関数として検証する。
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __mdir = dirname(fileURLToPath(import.meta.url));

describe("0004 migration: difficulty backfill 順序（Codex#3 回帰）", () => {
  const sql = readFileSync(join(__mdir, "../../supabase/migrations/0004_rls_fk_notnull.sql"), "utf-8");

  it("既存 NULL を埋める UPDATE が SET NOT NULL より前に存在する", () => {
    const backfillIdx = sql.search(
      /update\s+public\.review_states\s+set\s+difficulty\s*=\s*5\.17\s+where\s+difficulty\s+is\s+null/i,
    );
    const notNullIdx = sql.search(/alter\s+column\s+difficulty\s+set\s+not\s+null/i);
    expect(backfillIdx).toBeGreaterThanOrEqual(0);
    expect(notNullIdx).toBeGreaterThanOrEqual(0);
    expect(backfillIdx).toBeLessThan(notNullIdx);
  });
});

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

// 0005: RLS INSERT/UPDATE の列内容ガード（WITH CHECK に topic 非空を追加）を純関数でモデル化する。
// 行所有（auth.uid()=user_id）に加え `topic is not null and length(btrim(topic)) > 0` を要求する。
const topicNonEmpty = (topic: string | null | undefined): boolean =>
  topic !== null && topic !== undefined && topic.trim().length > 0;

const answerLogsInsertColumnGuard = (authUid: string | null, rowUserId: string, topic: string | null) =>
  authUid !== null && authUid === rowUserId && topicNonEmpty(topic);

const reviewStatesUpsertColumnGuard = (authUid: string | null, rowUserId: string, topic: string | null) =>
  authUid !== null && authUid === rowUserId && topicNonEmpty(topic);

describe("RLS 列ガード（0005 の WITH CHECK topic 非空）", () => {
  const USER_A = "uid-eee";
  const USER_B = "uid-fff";

  it("自分の行＋非空 topic の INSERT は通る（answer_logs）", () => {
    expect(answerLogsInsertColumnGuard(USER_A, USER_A, "三相交流電力")).toBe(true);
  });

  it("自分の行でも topic=null の INSERT は拒否される（列ガード）", () => {
    expect(answerLogsInsertColumnGuard(USER_A, USER_A, null)).toBe(false);
  });

  it("自分の行でも空白のみ topic（btrim 後ゼロ長）の INSERT は拒否される", () => {
    expect(answerLogsInsertColumnGuard(USER_A, USER_A, "   ")).toBe(false);
  });

  it("非空 topic でも他人名義の INSERT は拒否される（所有ガードは併存）", () => {
    expect(answerLogsInsertColumnGuard(USER_A, USER_B, "三相交流電力")).toBe(false);
  });

  it("review_states の upsert/update も同じ列ガードに従う", () => {
    expect(reviewStatesUpsertColumnGuard(USER_A, USER_A, "誘導電動機")).toBe(true);
    expect(reviewStatesUpsertColumnGuard(USER_A, USER_A, "")).toBe(false);
    expect(reviewStatesUpsertColumnGuard(USER_A, USER_A, null)).toBe(false);
    expect(reviewStatesUpsertColumnGuard(USER_A, USER_B, "誘導電動機")).toBe(false);
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
