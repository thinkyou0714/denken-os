/**
 * supabase-store.ts の I/O ラッパ（Store 3クラス）を、インメモリの疑似 SupabaseClient で
 * エンドツーエンドに検証する。実 DB は認証が要るので、ここではクエリビルダの呼び出し系列を
 * 忠実に模した fake を使い、upsert/get/list/append/byUser/set と error 伝播を確認する。
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import type { AnswerLog } from "../../lib/scheduler/diagnosis.js";
import type { ReviewState } from "../../lib/scheduler/types.js";
import type { Entitlement } from "../../lib/store/index.js";
import {
  SupabaseAnswerLogStore,
  SupabaseEntitlementStore,
  SupabaseProblemStore,
  SupabaseReviewStateStore,
} from "../../lib/store/supabase-store.js";
import { loadProblemFixture } from "../helpers/fixtures.js";

const T0001 = loadProblemFixture("T-0001");

type Row = Record<string, unknown>;

class FakeQuery implements PromiseLike<{ data: Row[]; error: { message: string } | null }> {
  private filters: [string, unknown][] = [];
  private ordering: { col: string; ascending: boolean } | null = null;
  constructor(
    private store: Row[],
    private error: string | undefined,
  ) {}
  select(_cols?: string): this {
    return this;
  }
  // 実 DB の ORDER BY を模して実際にソートする（byUser の「昇順」契約をテストで実効化する）。
  order(col: string, opts?: { ascending?: boolean }): this {
    this.ordering = { col, ascending: opts?.ascending !== false };
    return this;
  }
  eq(col: string, val: unknown): this {
    this.filters.push([col, val]);
    return this;
  }
  private matched(): Row[] {
    const rows = this.store.filter((r) => this.filters.every(([c, v]) => r[c] === v));
    if (this.ordering) {
      const { col, ascending } = this.ordering;
      rows.sort((a, b) => {
        const av = String(a[col] ?? "");
        const bv = String(b[col] ?? "");
        return ascending ? av.localeCompare(bv) : bv.localeCompare(av);
      });
    }
    return rows;
  }
  private pkMatch(row: Row): (r: Row) => boolean {
    if ("id" in row) return (r) => r.id === row.id;
    return (r) => r.user_id === row.user_id && r.topic === row.topic;
  }
  insert(row: Row): Promise<{ data: null; error: { message: string } | null }> {
    if (this.error) return Promise.resolve({ data: null, error: { message: this.error } });
    this.store.push({ ...row });
    return Promise.resolve({ data: null, error: null });
  }
  upsert(row: Row): Promise<{ data: null; error: { message: string } | null }> {
    if (this.error) return Promise.resolve({ data: null, error: { message: this.error } });
    const idx = this.store.findIndex(this.pkMatch(row));
    if (idx >= 0) this.store[idx] = { ...row };
    else this.store.push({ ...row });
    return Promise.resolve({ data: null, error: null });
  }
  maybeSingle(): Promise<{ data: Row | null; error: { message: string } | null }> {
    if (this.error) return Promise.resolve({ data: null, error: { message: this.error } });
    return Promise.resolve({ data: this.matched()[0] ?? null, error: null });
  }
  // Supabase のクエリビルダは「チェーン可能かつ await 可能」な thenable。これを忠実に模すため
  // 意図的に then を実装している（テスト専用のスタブ）。
  // biome-ignore lint/suspicious/noThenProperty: faithfully mock Supabase's thenable query builder
  then<R1, R2 = never>(
    onfulfilled?: ((v: { data: Row[]; error: { message: string } | null }) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null,
  ): Promise<R1 | R2> {
    const result = this.error
      ? { data: [] as Row[], error: { message: this.error } }
      : { data: this.matched(), error: null };
    return Promise.resolve(result).then(onfulfilled, onrejected);
  }
}

class FakeClient {
  private tables = new Map<string, Row[]>();
  constructor(private error?: string) {}
  from(name: string): FakeQuery {
    if (!this.tables.has(name)) this.tables.set(name, []);
    return new FakeQuery(this.tables.get(name)!, this.error);
  }
}

function client(error?: string): SupabaseClient {
  return new FakeClient(error) as unknown as SupabaseClient;
}

describe("SupabaseProblemStore", () => {
  it("upsert → get → list（filter あり/なし）が往復する", async () => {
    const store = new SupabaseProblemStore(client());
    await store.upsert(T0001);
    const got = await store.get("T-0001");
    expect(got?.answer).toBe("3.2");
    expect(got?.choices).toEqual(["2.56", "3.2", "4.0", "9.6"]);

    expect((await store.list()).length).toBe(1);
    expect((await store.list({ status: "validated" })).length).toBe(1);
    expect((await store.list({ status: "draft" })).length).toBe(0);
    expect((await store.list({ topic: "三相交流電力" })).length).toBe(1);
  });

  it("同一 id の upsert は上書きする", async () => {
    const store = new SupabaseProblemStore(client());
    await store.upsert(T0001);
    await store.upsert({ ...T0001, answer: "9.6" });
    expect((await store.list()).length).toBe(1);
    expect((await store.get("T-0001"))?.answer).toBe("9.6");
  });

  it("存在しない id は undefined", async () => {
    expect(await new SupabaseProblemStore(client()).get("NOPE")).toBeUndefined();
  });

  it("error は例外として伝播する", async () => {
    const store = new SupabaseProblemStore(client("boom"));
    await expect(store.upsert(T0001)).rejects.toThrow("boom");
    await expect(store.get("T-0001")).rejects.toThrow("boom");
    await expect(store.list()).rejects.toThrow("boom");
  });
});

describe("SupabaseAnswerLogStore", () => {
  it("append → byUser で本人分のログを返す（problemId も往復）", async () => {
    const store = new SupabaseAnswerLogStore(client());
    await store.append("u1", { topic: "理論", correct: true, atMs: 1000, timeMs: 5000, problemId: "T-0001" });
    await store.append("u1", { topic: "電力", correct: false, atMs: 2000 });
    await store.append("u2", { topic: "機械", correct: true, atMs: 3000 });
    const logs = await store.byUser("u1");
    expect(logs.length).toBe(2);
    expect(logs[0]?.topic).toBe("理論");
    expect(logs[0]?.timeMs).toBe(5000);
    expect(logs[0]?.problemId).toBe("T-0001");
    expect(logs[1]?.timeMs).toBeUndefined();
    expect(logs[1]?.problemId).toBeUndefined();
  });

  it("順不同で append しても byUser は atMs 昇順で返す（契約の実効テスト）", async () => {
    const store = new SupabaseAnswerLogStore(client());
    await store.append("u1", { topic: "後", correct: true, atMs: 3000 });
    await store.append("u1", { topic: "先", correct: false, atMs: 1000 });
    await store.append("u1", { topic: "中", correct: true, atMs: 2000 });
    const logs = await store.byUser("u1");
    expect(logs.map((l) => l.atMs)).toEqual([1000, 2000, 3000]);
  });

  it("error は例外として伝播する", async () => {
    const store = new SupabaseAnswerLogStore(client("db down"));
    await expect(store.append("u1", { topic: "理論", correct: true, atMs: 1 })).rejects.toThrow("db down");
    await expect(store.byUser("u1")).rejects.toThrow("db down");
  });
});

describe("SupabaseReviewStateStore", () => {
  const st: ReviewState = { reps: 2, lapses: 1, intervalDays: 6, ease: 2.5, dueMs: 1000, lastReviewMs: 500 };

  it("createdAtMs が set → get 往復で保持される（0007 / silent drop 回帰防止）", async () => {
    const store = new SupabaseReviewStateStore(client());
    const withCreated: ReviewState = { ...st, createdAtMs: Date.UTC(2026, 0, 1) };
    await store.set("u1", "理論", withCreated);
    expect((await store.get("u1", "理論"))?.createdAtMs).toBe(Date.UTC(2026, 0, 1));
    // 未設定（旧データ相当）は undefined のまま。
    await store.set("u1", "電力", st);
    expect((await store.get("u1", "電力"))?.createdAtMs).toBeUndefined();
  });

  it("set → get → byUser が往復する", async () => {
    const store = new SupabaseReviewStateStore(client());
    await store.set("u1", "三相交流電力", st);
    await store.set("u1", "誘導電動機の回転速度", { ...st, reps: 9 });
    expect((await store.get("u1", "三相交流電力"))?.reps).toBe(2);
    const map = await store.byUser("u1");
    expect(map.size).toBe(2);
    expect(map.get("誘導電動機の回転速度")?.reps).toBe(9);
  });

  it("同一ユーザー×論点の set は上書きする", async () => {
    const store = new SupabaseReviewStateStore(client());
    await store.set("u1", "理論", st);
    await store.set("u1", "理論", { ...st, reps: 99 });
    expect((await store.byUser("u1")).size).toBe(1);
    expect((await store.get("u1", "理論"))?.reps).toBe(99);
  });

  it("未登録は undefined / error は伝播", async () => {
    expect(await new SupabaseReviewStateStore(client()).get("u1", "x")).toBeUndefined();
    const bad = new SupabaseReviewStateStore(client("nope"));
    await expect(bad.set("u1", "t", st)).rejects.toThrow("nope");
    await expect(bad.byUser("u1")).rejects.toThrow("nope");
  });
});

describe("SupabaseEntitlementStore", () => {
  const ent: Entitlement = {
    userId: "u1",
    tier: "pro",
    status: "active",
    source: "stripe",
    currentPeriodEndMs: Date.UTC(2026, 6, 1),
    stripeCustomerId: "cus_test_123",
    stripeSubscriptionId: "sub_test_456",
    updatedAtMs: Date.UTC(2026, 5, 1),
  };

  it("upsert → get / byStripeCustomer が往復する", async () => {
    const store = new SupabaseEntitlementStore(client());
    await store.upsert(ent);
    const got = await store.get("u1");
    expect(got).toEqual(ent);
    const byCustomer = await store.byStripeCustomer("cus_test_123");
    expect(byCustomer?.userId).toBe("u1");
    expect(byCustomer?.tier).toBe("pro");
  });

  it("同一 userId の upsert は上書きする", async () => {
    const store = new SupabaseEntitlementStore(client());
    await store.upsert(ent);
    await store.upsert({ ...ent, tier: "free", status: "canceled" });
    const got = await store.get("u1");
    expect(got?.tier).toBe("free");
    expect(got?.status).toBe("canceled");
  });

  it("未登録の userId / customerId は undefined", async () => {
    const store = new SupabaseEntitlementStore(client());
    expect(await store.get("nobody")).toBeUndefined();
    expect(await store.byStripeCustomer("cus_missing")).toBeUndefined();
  });

  it("stripe 未連携（customerId 無し）の entitlement も往復する", async () => {
    const store = new SupabaseEntitlementStore(client());
    const grant: Entitlement = {
      userId: "u2",
      tier: "pro",
      status: "active",
      source: "grant",
      currentPeriodEndMs: null,
      updatedAtMs: Date.UTC(2026, 5, 1),
    };
    await store.upsert(grant);
    const got = await store.get("u2");
    expect(got).toEqual(grant);
    expect(got?.stripeCustomerId).toBeUndefined();
  });

  it("error は操作名付き例外として伝播する", async () => {
    const store = new SupabaseEntitlementStore(client("boom"));
    await expect(store.get("u1")).rejects.toThrow("entitlements.get failed: boom");
    await expect(store.byStripeCustomer("cus_x")).rejects.toThrow("entitlements.byStripeCustomer failed: boom");
    await expect(store.upsert(ent)).rejects.toThrow("entitlements.upsert failed: boom");
  });
});

// AnswerLog 型を参照して未使用 import を避ける（mapper の戻り型確認）。
const _typecheck: AnswerLog = { topic: "t", correct: true, atMs: 0 };
void _typecheck;
