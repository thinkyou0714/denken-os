// @vitest-environment jsdom
/// <reference lib="dom" />
/**
 * tests/infra/a11y-smoke.test.ts
 *
 * 代表的な静的 HTML スニペットを jsdom 上で組み立て、axe-core で
 * クリティカル/シリアスなアクセシビリティ違反が無いことを検証する煙テスト。
 *
 * 方針:
 *   - web/ のソースは別エージェントが触っているため import しない。
 *     ここで検証するのは「アプリが踏襲すべき静的 HTML パターン」（見出し階層・
 *     ボタンのラベル・画像の代替テキスト・フォームのラベル・ARIA live 等）であり、
 *     実装ファイルではなくパターンに対する回帰防止ネットとして機能する。
 *   - 実行環境はこのファイルだけ jsdom（先頭の docblock）。リポジトリ全体の
 *     既定 vitest environment は node のまま（vitest.config.ts は変更しない）。
 *   - color-contrast ルールは実レイアウト/描画を要するため jsdom では信頼できない。
 *     構造的なクリティカル違反の検出に集中するため、当ルールは無効化する。
 */
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

// jsdom では実描画が無いため色コントラスト判定が不安定。構造系ルールに集中する。
const AXE_OPTIONS = {
  rules: {
    "color-contrast": { enabled: false },
  },
} as const;

/** body にスニペットを差し込み、検査対象の要素を返す。 */
function render(html: string): HTMLElement {
  document.body.innerHTML = html;
  return document.body;
}

/** critical / serious のみ抽出（煙テストのしきい値）。 */
function criticalViolations(violations: { id: string; impact?: string | null }[]): string[] {
  return violations.filter((v) => v.impact === "critical" || v.impact === "serious").map((v) => v.id);
}

describe("a11y smoke: 代表的な静的 HTML パターンに致命的違反が無い", () => {
  it("学習ビューの代表構造（見出し・ボタン・画像 alt）は致命的違反なし", async () => {
    const body = render(`
      <main aria-label="学習">
        <h1>今日の学習</h1>
        <section aria-labelledby="sec-quiz">
          <h2 id="sec-quiz">問題</h2>
          <p>次の値を求めよ。</p>
          <ul>
            <li><button type="button">選択肢 A</button></li>
            <li><button type="button">選択肢 B</button></li>
          </ul>
          <img src="circuit.png" alt="RLC 直列回路の図" />
        </section>
      </main>
    `);
    const results = await axe(body, AXE_OPTIONS);
    expect(criticalViolations(results.violations)).toEqual([]);
  });

  it("フォーム（設定ビュー相当）はラベル付き入力で致命的違反なし", async () => {
    const body = render(`
      <main aria-label="設定">
        <h1>設定</h1>
        <form>
          <label for="goal-date">目標日</label>
          <input id="goal-date" name="goal-date" type="date" />

          <label for="daily-count">1日の問題数</label>
          <input id="daily-count" name="daily-count" type="number" min="1" />

          <button type="submit">保存</button>
        </form>
      </main>
    `);
    const results = await axe(body, AXE_OPTIONS);
    expect(criticalViolations(results.violations)).toEqual([]);
  });

  it("ARIA live 領域つきトースト/ステータス表示は致命的違反なし", async () => {
    const body = render(`
      <main aria-label="ダッシュボード">
        <h1>ダッシュボード</h1>
        <div role="status" aria-live="polite">保存しました</div>
        <nav aria-label="主要タブ">
          <button type="button" aria-current="page">概要</button>
          <button type="button">履歴</button>
        </nav>
      </main>
    `);
    const results = await axe(body, AXE_OPTIONS);
    expect(criticalViolations(results.violations)).toEqual([]);
  });

  // ── ネガティブ確認: axe が実際に違反を検出できることを保証する（テストが空振りでない証明）。
  it("alt 無し画像は image-alt 違反として検出される（検出器が機能している証明）", async () => {
    const body = render(`<main><h1>x</h1><img src="circuit.png" /></main>`);
    const results = await axe(body, AXE_OPTIONS);
    expect(results.violations.map((v) => v.id)).toContain("image-alt");
  });

  it("ラベル無しの入力は label 系違反として検出される", async () => {
    const body = render(`<main><h1>x</h1><form><input type="text" name="bare" /></form></main>`);
    const results = await axe(body, AXE_OPTIONS);
    // axe は label / form-field-multiple-labels 等で報告する。空配列でないことを要求。
    expect(results.violations.length).toBeGreaterThan(0);
  });
});
