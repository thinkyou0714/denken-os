/**
 * app 結線スモーク（依存なし・静的）。
 * app.ts は DOM 配線で単体 coverage 対象外（vitest.config の exclude）。その「結線」を
 * jsdom 等の重い依存を足さずに静的検査で担保する（coverage コメントが約束する bundle-smoke の実体）。
 *
 * 主眼: app.ts が $("id") で参照する要素が index.html に必ず存在すること。
 *   $ = (id) => document.getElementById(id)!  と non-null 断言しているため、id 不一致は
 *   実行時に「null へのアクセス」でクラッシュする。型検査では捕まらないクラスの結線バグ。
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const appSrc = readFileSync(join(ROOT, "web/src/app.ts"), "utf8");
const indexHtml = readFileSync(join(ROOT, "web/index.html"), "utf8");

function htmlIds(html: string): Set<string> {
  return new Set([...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]!));
}
function queriedIds(src: string): string[] {
  return [...new Set([...src.matchAll(/\$\("([^"]+)"\)/g)].map((m) => m[1]!))];
}

describe("app 結線スモーク（DOM id 整合・依存なし）", () => {
  it("app.ts が $() で参照する全 id が index.html に存在する（id 不一致→実行時クラッシュを防ぐ）", () => {
    const ids = htmlIds(indexHtml);
    const queried = queriedIds(appSrc);
    expect(queried.length).toBeGreaterThan(0); // 抽出が機能している
    const missing = queried.filter((id) => !ids.has(id));
    expect(missing, `index.html に不在の id: ${missing.join(", ")}`).toEqual([]);
  });

  it("index.html がビルド済みバンドルを読み込み、app.ts が SW を登録する", () => {
    expect(indexHtml).toMatch(/<script[^>]+src="\.\/dist\/app\.js"/); // エントリ結線
    expect(appSrc).toContain('navigator.serviceWorker.register("./sw.js")'); // オフライン結線
  });

  it("動的更新領域(feedback)が aria-live を持つ（grade の innerHTML 差し替えが読み上げられる）", () => {
    // feedback は grade() が innerHTML を差し替える動的領域。aria-live が無いと更新が読み上げられない（A11Y 回帰防止）。
    expect(indexHtml).toMatch(/id="feedback"[^>]*aria-live/);
  });

  it("CSP は script を同一オリジン限定にする（外部 script 注入を禁止）", () => {
    // 外部 <script> 結線が紛れ込んでも CSP が実行を止める前提を回帰で固定する。
    expect(indexHtml).toMatch(/Content-Security-Policy/);
    expect(indexHtml).toMatch(/script-src 'self'/);
  });
});
