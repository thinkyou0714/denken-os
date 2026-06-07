/**
 * ビルド時のセキュリティガード（service_role 等サーバ専用シークレットの client 混入検知）。
 * scripts/build-web.ts の assertNoServerSecrets を直接検証する（純関数・I/O なし）。
 */
import { describe, expect, it } from "vitest";
import { assertNoServerSecrets, computeCacheVersion, stampServiceWorker } from "../../scripts/build-web.js";

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

describe("computeCacheVersion（SW 版数の内容ハッシュ）", () => {
  it("同じ内容なら同じ版数（決定論）", () => {
    expect(computeCacheVersion(["a", "b"])).toBe(computeCacheVersion(["a", "b"]));
  });

  it("内容が変われば版数が変わる（キャッシュ更新が走る）", () => {
    expect(computeCacheVersion(["a", "b"])).not.toBe(computeCacheVersion(["a", "c"]));
  });

  it("denken-os- 接頭辞 + 12桁hex の形", () => {
    expect(computeCacheVersion(["x"])).toMatch(/^denken-os-[0-9a-f]{12}$/);
  });
});

describe("stampServiceWorker（版数差し替え・idempotent）", () => {
  it("プレースホルダを版数へ置換する", () => {
    const src = 'const CACHE = "denken-os-__BUILD_HASH__";';
    expect(stampServiceWorker(src, "denken-os-abc123abc123")).toBe('const CACHE = "denken-os-abc123abc123";');
  });

  it("既存ハッシュも再置換できる（再ビルドで更新）", () => {
    const src = 'const CACHE = "denken-os-old00000old0";';
    expect(stampServiceWorker(src, "denken-os-new111new111")).toContain("denken-os-new111new111");
    expect(stampServiceWorker(src, "denken-os-new111new111")).not.toContain("old00000old0");
  });

  it("最初の1箇所だけ置換する（CACHE 定義は1つ想定）", () => {
    const src = '// 例: denken-os-__BUILD_HASH__\nconst CACHE = "denken-os-__BUILD_HASH__";';
    const out = stampServiceWorker(src, "denken-os-zzz999zzz999");
    expect(out).toContain("denken-os-zzz999zzz999"); // 先頭の出現を置換
    expect(out).toContain("denken-os-__BUILD_HASH__"); // 2 つ目は残る（非 /g）
  });
});
