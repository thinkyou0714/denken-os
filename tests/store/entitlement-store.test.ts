import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { fileStores } from "../../lib/store/file-store.js";
import {
  defaultEntitlement,
  type Entitlement,
  entitlementAllows,
  InMemoryEntitlementStore,
} from "../../lib/store/index.js";
import { entitlementToRow, rowToEntitlement } from "../../lib/store/supabase-store.js";

const NOW = 1_700_000_000_000;

const proEntitlement: Entitlement = {
  userId: "uid-1",
  tier: "pro",
  status: "active",
  source: "stripe",
  currentPeriodEndMs: NOW + 30 * 24 * 3600 * 1000,
  stripeCustomerId: "cus_ABC",
  stripeSubscriptionId: "sub_XYZ",
  updatedAtMs: NOW,
};

describe("defaultEntitlement / entitlementAllows（純関数 gate）", () => {
  it("defaultEntitlement は free/none/default を返す", () => {
    const e = defaultEntitlement("uid-x", NOW);
    expect(e).toEqual({
      userId: "uid-x",
      tier: "free",
      status: "none",
      source: "default",
      currentPeriodEndMs: null,
      updatedAtMs: NOW,
    });
  });

  it("free tier は Pro 機能を一切許可しない", () => {
    const free = defaultEntitlement("uid-x", NOW);
    for (const f of ["unlimitedPractice", "adaptiveSelection", "deepExplanations", "cloudSync"] as const) {
      expect(entitlementAllows(free, f)).toBe(false);
    }
  });

  it("pro tier は active/trialing のときのみ許可する", () => {
    expect(entitlementAllows(proEntitlement, "cloudSync")).toBe(true);
    expect(entitlementAllows({ ...proEntitlement, status: "trialing" }, "adaptiveSelection")).toBe(true);
    expect(entitlementAllows({ ...proEntitlement, status: "past_due" }, "cloudSync")).toBe(false);
    expect(entitlementAllows({ ...proEntitlement, status: "canceled" }, "cloudSync")).toBe(false);
  });
});

describe("InMemoryEntitlementStore", () => {
  it("upsert→get で往復し、未登録は undefined", async () => {
    const s = new InMemoryEntitlementStore();
    expect(await s.get("uid-1")).toBeUndefined();
    await s.upsert(proEntitlement);
    expect((await s.get("uid-1"))?.tier).toBe("pro");
  });

  it("byStripeCustomer で customer から逆引きできる", async () => {
    const s = new InMemoryEntitlementStore();
    await s.upsert(proEntitlement);
    expect((await s.byStripeCustomer("cus_ABC"))?.userId).toBe("uid-1");
    expect(await s.byStripeCustomer("cus_UNKNOWN")).toBeUndefined();
  });

  it("同一 userId の upsert は上書きされる", async () => {
    const s = new InMemoryEntitlementStore();
    await s.upsert(proEntitlement);
    await s.upsert({ ...proEntitlement, tier: "free", status: "canceled" });
    expect((await s.get("uid-1"))?.status).toBe("canceled");
  });
});

describe("FileEntitlementStore（JSON永続化）", () => {
  let dir: string;
  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), "denken-entitlement-"));
  });
  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("再読込しても永続化されている", async () => {
    const a = fileStores(dir);
    await a.entitlements.upsert(proEntitlement);
    const b = fileStores(dir);
    expect((await b.entitlements.get("uid-1"))?.tier).toBe("pro");
    expect((await b.entitlements.byStripeCustomer("cus_ABC"))?.userId).toBe("uid-1");
  });
});

describe("entitlements 行 ⇔ ドメイン マッパー（往復不変）", () => {
  it("Pro（全フィールド有り）が往復する", () => {
    const round = rowToEntitlement(entitlementToRow(proEntitlement));
    expect(round).toEqual(proEntitlement);
  });

  it("既定 free（stripe フィールド無し）が往復する", () => {
    const free = defaultEntitlement("uid-2", NOW);
    const round = rowToEntitlement(entitlementToRow(free));
    expect(round).toEqual(free);
    expect("stripeCustomerId" in round).toBe(false);
  });

  it("不正な tier は zod で拒否される（テーブル名つきエラー）", () => {
    const row = entitlementToRow(proEntitlement);
    expect(() => rowToEntitlement({ ...row, tier: "enterprise" })).toThrow(/entitlements table, user=uid-1/);
  });

  it("不正な status は拒否される", () => {
    const row = entitlementToRow(proEntitlement);
    expect(() => rowToEntitlement({ ...row, status: "bogus" })).toThrow(/entitlements table/);
  });
});
