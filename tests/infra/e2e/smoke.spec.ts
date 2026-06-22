/**
 * tests/infra/e2e/smoke.spec.ts
 *
 * 最小限の E2E 煙テスト（Playwright）。アプリのシェルが配信・初期化され、
 * 主要ランドマーク（ナビ・ビュー）が DOM に存在することだけを確認する。
 *
 * 実行前提:
 *   - `npm run build:web`（web/dist/app.js を生成）
 *   - Chromium バイナリ（`npx playwright install chromium`）
 *   いずれも開発 sandbox では取得制約があるため、CI（.github/workflows/e2e.yml,
 *   非必須）でのみ実行する。詳細は tests/infra/playwright.config.ts を参照。
 */
import { expect, test } from "@playwright/test";

test.describe("DENKEN-OS シェルの煙テスト", () => {
  test("トップページが読み込まれ、タイトルと主要ランドマークが存在する", async ({ page }) => {
    await page.goto("/index.html");

    // ページタイトル（index.html の <title>）。
    await expect(page).toHaveTitle(/DENKEN-OS/);

    // 言語属性が日本語に設定されている（a11y の基本）。
    await expect(page.locator("html")).toHaveAttribute("lang", "ja");

    // アプリシェルの主要コンテナ（index.html 由来の安定 id）。
    await expect(page.locator("#nav")).toBeAttached();
    await expect(page.locator("#view")).toBeAttached();
  });

  test("コンソールに致命的エラーを出さずに初期描画する", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.goto("/index.html");
    // 初期描画でビューに何らかの内容が入るのを待つ（厳密な文言には依存しない）。
    await page.waitForLoadState("networkidle");

    expect(errors, `console/page errors: ${errors.join(" | ")}`).toEqual([]);
  });
});
