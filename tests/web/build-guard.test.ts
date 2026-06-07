/**
 * ビルド時のセキュリティガード（service_role 等サーバ専用シークレットの client 混入検知）。
 * scripts/build-web.ts の assertNoServerSecrets を直接検証する（純関数・I/O なし）。
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
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

describe("コミット済み sw.js のプレースホルダ不変条件", () => {
  // build:web は web/sw.js を内容ハッシュで in-place stamp する（web/dist は gitignore＝CI で再生成）。
  // コミット版は必ず __BUILD_HASH__ プレースホルダのままで、stamp 済みハッシュを誤って commit しない。
  // verify は test→build:web 順なので test 実行時はプレースホルダ、CI も同順＝ハッシュ混入を検出できる。
  it("web/sw.js は denken-os-__BUILD_HASH__ プレースホルダを保持する（ハッシュ混入を防ぐ）", () => {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const sw = readFileSync(join(__dirname, "../../web/sw.js"), "utf8");
    expect(sw).toContain('const CACHE = "denken-os-__BUILD_HASH__"');
  });
});
