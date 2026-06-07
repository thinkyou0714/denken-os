/**
 * ビルド時のセキュリティガード（service_role 等サーバ専用シークレットの client 混入検知）。
 * scripts/build-web.ts の assertNoServerSecrets を直接検証する（純関数・I/O なし）。
 */
import { describe, expect, it } from "vitest";
import { assertNoServerSecrets } from "../../scripts/build-web.js";

describe("assertNoServerSecrets（クライアント混入ガード）", () => {
  it("通常のバンドルは通す", () => {
    expect(() => assertNoServerSecrets('const x=1;fetch("./problems.json");')).not.toThrow();
  });

  it("service_role の痕跡があれば失敗させる", () => {
    expect(() => assertNoServerSecrets('const k="...role\\":\\"service_role...";')).toThrow(/service_role/);
  });

  it("サーバ専用 env 名も弾く", () => {
    expect(() => assertNoServerSecrets("process.env.SUPABASE_SERVICE_ROLE_KEY")).toThrow();
    expect(() => assertNoServerSecrets("SUPABASE_SERVICE_KEY=xxx")).toThrow();
  });
});
