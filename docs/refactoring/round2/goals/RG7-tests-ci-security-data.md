# RG7: テスト深度・CI成熟・セキュリティ・データ層・配信自動化

対応: II-175〜II-194（[ideas-round2.md](../ideas-round2.md)） / Wave 2（Wave1完了後）

## 目的（根本原因RR5）

ファズ/統合/fake-timersテストの欠如、CSP/SRIなし、SW版数手動、RLS不完全、SemVer形骸化を解消する。

## 所有ファイル（これ以外は編集禁止）

- `tests/**`, `vitest.config.ts`
- `scripts/**`（build-web.ts含む）
- `.github/workflows/**`, `renovate.json`, `.env.example`, `.gitignore`, 新規`.gitleaksignore`
- `supabase/migrations/`（新規 0004 のみ。既存は変更禁止）
- `web/index.html`, `web/sw.js`, `web/manifest.webmanifest`
- `package.json`
- 注: `web/src/**`・`lib/**`・`docs/**` は編集禁止（テスト対象の変更はしない。バグ発見時は`// TODO(audit):`で報告）

## 他タスクとの契約

- Wave1/2の成果（RG1〜RG6）が前提。テストは既存の意味を弱めず追加/ヘルパー化のみ。
- `web/index.html`にCSP/SRIを足す際、`web/src`が参照するDOM id/構造は変えない（meta/属性追加のみ）。
- SWのCACHEは`v20`へ上げ、build-webからの自動更新機構を入れる。

## 実装項目

### テスト深度（II-175〜II-181）
1. ファズテスト: pick/buildChoices/percentage/constrainRangeへランダム入力1000回（`tests/engine/fuzz.test.ts`）。
2. 統合テスト: generate→validate→FileStore保存→読込（`tests/integration/`新設）。
3. fake-timers徹底: schedule/notify/dates系で`vi.useFakeTimers`を適用（II-177）。
4. KNOWN_DIVERGENTにTODO(audit)コメント（II-178）。
5. カバレッジ要件別出力をSTEP_SUMMARYへ（II-179）。
6. 全テンプレgenerateFrom再現runner（II-180、II-101移行の保証網）。
7. RLSモック検証（II-181、`tests/supabase/`）。

### セキュリティ・配信（II-182〜II-188, II-193, II-194）
8. **CSP**（II-182）: index.html headに`Content-Security-Policy` meta（default-src 'self'; script-src 'self';
   style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://api.anthropic.com 等）。
   実アプリのfetch先（Anthropic/Supabase）を許可し、`npm run build:web`後にローカルで動作確認。
9. **SRI**（II-183）: build-web.tsでapp.jsのSHA-384を算出しindex.htmlの`<script>`に`integrity`埋込。
10. **.gitleaksignore**（II-184）＋**.env.example鍵分類**（II-185）。
11. **supabase 0004**（II-186）: RLSのUPDATE/DELETEポリシー補完、FK CASCADE、`review_states.difficulty` NOT NULL、
    各migrationに可逆コメント（`-- DROP ...`）。既存0001-0003は変更しない。
12. **SW版数自動化**（II-187）: build-webがdistハッシュから`CACHE`値を更新（プレースホルダ置換）。手動v19→自動v20。
13. **バンドルバジェット**（II-188）: `BUNDLE_SIZE_LIMIT_KB`（既定500）超過で警告→失敗、STEP_SUMMARYへ。
14. **manifest theme_color同期**（II-193）＋**meta description簡潔化**（II-194）。

### CI/リリース（II-189〜II-192）
15. SemVer土台（II-189）: release:checkでの版数更新方針（package.json）。
16. CI並列化（II-190）: test/build/validateの独立job化（依存最小）。
17. coverage upload を`if: success()`に（II-191）。キャッシュclearフラグをworkflow_dispatchに（II-192）。

## 受け入れ基準

- `npm run verify` 全グリーン、`npm run test:coverage` 閾値維持/向上。テスト数が増加。
- `npm run build:web` 成功・SRI integrityがindex.htmlに反映・SW CACHEが自動更新される。
- CSP下でアプリがローカルで起動（コンソールにCSP violationが出ない範囲を確認し報告）。
- YAML構文OK（python3でsafe_load）。`npx biome check scripts tests vitest.config.ts` エラーなし。
- `npm run build:problems` 後 `git diff --exit-code web/problems.json` 差分ゼロ。
</content>
