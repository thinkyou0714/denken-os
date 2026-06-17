/**
 * tests/supabase/store-recovery.test.ts
 *
 * supabase-store.ts の未テスト経路を、インメモリの疑似 SupabaseClient で検証する（II-138 / I-024）。
 *
 * - lenient リカバリモード: 破損行を inject し、strict モードでは table/id 付きで例外を投げ、
 *   lenient モードではスキップ＋warning して残りを返すことを確認する。
 * - createSupabaseStores の URL/key 空チェック（I-024）が早期に例外を投げることを確認する。
 *
 * tests/store/supabase-store.test.ts の fake-client パターンを踏襲しつつ、任意の生行
 * （破損行を含む）をテーブルへ直接 seed できるように拡張している。
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Problem } from "../../lib/engine/schema.js";
import {
  createSupabaseStores,
  SupabaseAnswerLogStore,
  SupabaseProblemStore,
  SupabaseReviewStateStore,
} from "../../lib/store/supabase-store.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const T0001: Problem = JSON.parse(readFileSync(join(__dirname, "../../data/problems/T-0001.json"), "utf8"));

type Row = Record<string, unknown>;

// ── seed 可能な fake SupabaseClient ───────────────────────────────────────────
// tests/store/supabase-store.test.ts の FakeQuery を踏襲。違いは「テーブルへ任意の生行を
// 直接 seed できる」点（破損行を list/byUser に流し込んで recovery 経路を踏む）。

class FakeQuery implements PromiseLike<{ data: Row[]; error: { message: string } | null }> {
  private filters: [string, unknown][] = [];
  constructor(private store: Row[]) {}
  select(_cols?: string): this {
    return this;
  }
  order(_col: string, _opts?: unknown): this {
    return this;
  }
  eq(col: string, val: unknown): this {
    this.filters.push([col, val]);
    return this;
  }
  private matched(): Row[] {
    return this.store.filter((r) => this.filters.every(([c, v]) => r[c] === v));
  }
  maybeSingle(): Promise<{ data: Row | null; error: { message: string } | null }> {
    return Promise.resolve({ data: this.matched()[0] ?? null, error: null });
  }
  // Supabase のクエリビルダは「チェーン可能かつ await 可能」な thenable。忠実に模すため
  // 意図的に then を実装している（テスト専用スタブ）。
  // biome-ignore lint/suspicious/noThenProperty: faithfully mock Supabase's thenable query builder
  then<R1, R2 = never>(
    onfulfilled?: ((v: { data: Row[]; error: { message: string } | null }) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null,
  ): Promise<R1 | R2> {
    return Promise.resolve({ data: this.matched(), error: null }).then(onfulfilled, onrejected);
  }
}

class FakeClient {
  private tables = new Map<string, Row[]>();
  /** テーブルへ生行を直接投入する（破損行の inject に使う）。 */
  seed(name: string, rows: Row[]): void {
    this.tables.set(name, [...rows]);
  }
  from(name: string): FakeQuery {
    if (!this.tables.has(name)) this.tables.set(name, []);
    return new FakeQuery(this.tables.get(name)!);
  }
}

function seededClient(table: string, rows: Row[]): SupabaseClient {
  const c = new FakeClient();
  c.seed(table, rows);
  return c as unknown as SupabaseClient;
}

// 正常な ProblemRow（T-0001 由来）。破損行はこの形を崩して作る。
function validProblemRow(): Row {
  return {
    id: T0001.id,
    exam: T0001.exam ?? null,
    subject: T0001.subject,
    topic: T0001.topic,
    format: T0001.format ?? "multiple_choice",
    difficulty: T0001.difficulty,
    statement: T0001.statement,
    choices: T0001.choices ?? null,
    answer: T0001.answer,
    solution: T0001.solution,
    validation: T0001.validation,
    source: T0001.source,
    stats: T0001.stats ?? null,
    status: T0001.status ?? "validated",
  };
}

const validReviewRow = (userId: string, topic: string): Row => ({
  user_id: userId,
  topic,
  reps: 1,
  lapses: 0,
  interval_days: 3,
  ease: 2.5,
  due_at: "2026-01-01T00:00:00.000Z",
  last_review_at: null,
});

// answer_logs.byUser は .eq("user_id", userId) で絞るため user_id 列が必須。
// rowToAnswerLog の zod 検証対象には user_id は含まれないが、fake のフィルタに通すため付与する。
const validAnswerRow = (userId: string, topic: string): Row => ({
  user_id: userId,
  topic,
  correct: true,
  time_ms: 1000,
  answered_at: "2026-01-01T00:00:00.000Z",
  problem_id: null,
});

describe("supabase-store: strict モードは破損行で table/id 付きの例外を投げる", () => {
  it("problems.list: 破損行 (difficulty 欠落) で id 入りエラー", async () => {
    const corrupt: Row = { ...validProblemRow(), id: "BAD-1" };
    delete corrupt.difficulty;
    const store = new SupabaseProblemStore(seededClient("problems", [validProblemRow(), corrupt]));
    await expect(store.list()).rejects.toThrow(/problems table, id=BAD-1/);
  });

  it("review_states.byUser: 破損行 (ease が文字列) で user/topic 入りエラー", async () => {
    const corrupt = { ...validReviewRow("u1", "破損"), ease: "NaN" };
    const store = new SupabaseReviewStateStore(seededClient("review_states", [corrupt]));
    await expect(store.byUser("u1")).rejects.toThrow(/review_states table, user=u1 topic=破損/);
  });

  it("answer_logs.byUser: 破損行 (correct 欠落) で user 入りエラー", async () => {
    const corrupt = { ...validAnswerRow("u1", "理論") };
    delete corrupt.correct;
    const store = new SupabaseAnswerLogStore(seededClient("answer_logs", [corrupt]));
    await expect(store.byUser("u1")).rejects.toThrow(/answer_logs table, user=u1/);
  });
});

describe("supabase-store: lenient モードは破損行をスキップし残りを返す（warning 付き）", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    warnSpy.mockRestore();
  });

  it("problems.list({ lenient: true }): 正常1件 + 破損1件 → 正常のみ返し warning", async () => {
    const corrupt: Row = { ...validProblemRow(), id: "BAD-2" };
    delete corrupt.difficulty;
    const store = new SupabaseProblemStore(seededClient("problems", [validProblemRow(), corrupt]));
    const got = await store.list(undefined, { lenient: true });
    expect(got).toHaveLength(1);
    expect(got[0]?.id).toBe(T0001.id);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(String(warnSpy.mock.calls[0]?.[0])).toContain("id=BAD-2");
  });

  it("review_states.byUser(lenient): 正常1件 + 破損1件 → Map に正常のみ、warning", async () => {
    const corrupt = { ...validReviewRow("u1", "壊れた論点"), reps: -5 };
    const store = new SupabaseReviewStateStore(
      seededClient("review_states", [validReviewRow("u1", "良い論点"), corrupt]),
    );
    const map = await store.byUser("u1", { lenient: true });
    expect(map.size).toBe(1);
    expect(map.has("良い論点")).toBe(true);
    expect(map.has("壊れた論点")).toBe(false);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(String(warnSpy.mock.calls[0]?.[0])).toContain("壊れた論点");
  });

  it("answer_logs.byUser(lenient): 正常1件 + 破損1件 → 正常のみ返し warning", async () => {
    const corrupt = { ...validAnswerRow("u1", "壊れ"), correct: "yes" };
    const store = new SupabaseAnswerLogStore(seededClient("answer_logs", [validAnswerRow("u1", "良い"), corrupt]));
    const logs = await store.byUser("u1", { lenient: true });
    expect(logs).toHaveLength(1);
    expect(logs[0]?.topic).toBe("良い");
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(String(warnSpy.mock.calls[0]?.[0])).toContain("u1");
  });

  it("lenient でも全件正常なら全件返り warning は出ない", async () => {
    const store = new SupabaseProblemStore(seededClient("problems", [validProblemRow()]));
    const got = await store.list(undefined, { lenient: true });
    expect(got).toHaveLength(1);
    expect(warnSpy).not.toHaveBeenCalled();
  });
});

describe("createSupabaseStores: URL/key 空チェック（I-024）", () => {
  it("url が空文字なら例外", () => {
    expect(() => createSupabaseStores("", "anon-key")).toThrow(/url が空です/);
  });

  it("url が空白のみでも例外", () => {
    expect(() => createSupabaseStores("   ", "anon-key")).toThrow(/url が空です/);
  });

  it("key が空文字なら例外", () => {
    expect(() => createSupabaseStores("https://example.supabase.co", "")).toThrow(/key が空です/);
  });

  it("key が空白のみでも例外", () => {
    expect(() => createSupabaseStores("https://example.supabase.co", "  \t ")).toThrow(/key が空です/);
  });

  it("url と key が揃えば 3 ストアを返す", () => {
    const stores = createSupabaseStores("https://example.supabase.co", "anon-key");
    expect(stores.problems).toBeInstanceOf(SupabaseProblemStore);
    expect(stores.answerLogs).toBeInstanceOf(SupabaseAnswerLogStore);
    expect(stores.reviewStates).toBeInstanceOf(SupabaseReviewStateStore);
  });
});
