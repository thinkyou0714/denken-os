# リファクタリング計画（2026-06）

3つの深掘り監査（lib/ エンジン、web/ フロントエンド、tests/CI/設定）で抽出した
約100件の改善アイデア（[ideas-100.md](./ideas-100.md)）を、**根本原因の改善**を軸に
フェーズ分けして実装する。各タスクは `goals/` のゴールファイル1枚に対応し、
ファイル所有権を厳密に分割して並列実装できるよう設計している。

## 根本原因の診断（なぜこの分け方か）

| # | 根本原因 | 症状 | 対応タスク |
|---|---------|------|-----------|
| R1 | `web/src/app.ts` が2,570行のモノリス（画面描画・状態・ルーティング・採点・タイマーが同居） | 変更影響が読めない、テスト不能、281行の `renderDashboard` 等の神関数 | G6 |
| R2 | テンプレート110個が同一ボイラープレートをコピペ（`pick()` が82ファイルに重複定義、buildFrom 5段構造、choices組み立て、ε=1e-6 が4箇所） | 修正が110箇所に波及、コピペドリフト | G1 |
| R3 | 共有定数・共有ヘルパーの欠如（`DAY_MS`/`JST_OFFSET_MS` が lib/web 双方で重複、整形関数3系統） | 同義コードの増殖、タイムゾーンバグの温床 | G1/G3/G4 |
| R4 | 「黙って握りつぶす」エラー処理（localStorage破損・quota超過・Supabase行の無検証キャスト） | データ消失がユーザーに見えない、スキーマ不一致が静かに伝播 | G3/G4 |
| R5 | 設定の緩み（biome: `noExplicitAny` off、SWキャッシュ版数の手動運用、CI と verify の差分） | 型安全の穴、配信事故リスク | G5/G9 |

## フェーズ構成（waveは並列実行単位）

```
Phase 0  計画策定（本ドキュメント＋ゴールファイル＋アイデアカタログ）……このコミット
Phase 1  基盤リファクタ（Wave 1: G1〜G5 を並列実行）
Phase 2  構造リファクタ（Wave 2: G6〜G7 を並列実行）※G6はG4完了が前提
Phase 3  仕上げ（Wave 3: G8〜G9 を並列実行 — 設定厳格化・ドキュメント整合）
各フェーズ末に `npm run verify`（lint/型/データ検証/604+テスト/ビルド）を全グリーン確認。
```

### Wave 1 — 基盤（互いにファイル素集合・既存公開APIは破壊しない）

| タスク | ゴールファイル | 所有ファイル | 概要 |
|--------|--------------|-------------|------|
| G1 | [goals/G1-template-helpers.md](./goals/G1-template-helpers.md) | `lib/engine/templates/**` | 共有ヘルパー層を新設し110テンプレのボイラープレートを根絶 |
| G2 | [goals/G2-engine-core.md](./goals/G2-engine-core.md) | `lib/engine/*.ts`, `figures/`, `xpost/` | ε一元化・narration照合の頑健化・barrel・設定可能化 |
| G3 | [goals/G3-lib-robustness.md](./goals/G3-lib-robustness.md) | `lib/`（engine以外） | 時間定数共有・Supabase行のzod検証・破損検知ログ |
| G4 | [goals/G4-web-modules.md](./goals/G4-web-modules.md) | `web/src/*.ts`（app.ts以外）, `index.html`, `sw.js`, `build-web.ts` | 日付ユーティリティ共有・保存失敗の可視化・SW堅牢化・a11y |
| G5 | [goals/G5-scripts-ci-config.md](./goals/G5-scripts-ci-config.md) | `scripts/`（build-web除く）, `.github/`, ルート設定 | スクリプト共通化・CI強化・設定整備 |

### Wave 2 — 構造（Wave 1 の成果の上に実施）

| タスク | ゴールファイル | 所有ファイル | 概要 |
|--------|--------------|-------------|------|
| G6 | [goals/G6-app-split.md](./goals/G6-app-split.md) | `web/src/app.ts` → `web/src/{ui,views,state}/` | モノリス分割（ビュー7枚＋部品＋状態） |
| G7 | [goals/G7-test-infra.md](./goals/G7-test-infra.md) | `tests/**`, `vitest.config.ts` | テスト共通ヘルパー・エッジケース補強・閾値見直し |

### Wave 3 — 仕上げ（コード確定後）

| タスク | ゴールファイル | 所有ファイル | 概要 |
|--------|--------------|-------------|------|
| G8 | [goals/G8-docs.md](./goals/G8-docs.md) | `README.md`, `CHANGELOG.md`, `docs/`（refactoring含む） | ドキュメント整合・実装結果の反映 |
| G9 | [goals/G9-strictness.md](./goals/G9-strictness.md) | `tsconfig*.json`, `biome.json` ＋全体の追随修正 | lint/型設定の厳格化と全体整合・最終verify |

## 並列実装の運用ルール（ゴールファイル共通の前提）

1. **ファイル所有権**: 各タスクは表の「所有ファイル」のみ変更してよい。他タスクの所有ファイルは
   import して使うのは可、編集は不可。`package.json` は Wave 1 では G5 のみが編集できる。
2. **公開API凍結（Wave 1）**: 既存の export シグネチャを壊さない（追加は可）。
   既存テストは**一切変更せずに**グリーンであること（テスト追加は可）。
3. **検証**: 各タスクは最低限 `npx biome check <所有ファイル>` と
   `npx vitest run <関連testディレクトリ>` を回す。リポジトリ全体の `npm run verify` は
   wave 完了後にオーケストレータが実施し、統合不整合はそこで修正する。
4. **挙動不変**: 本リファクタは外部挙動（生成される問題・採点結果・UI文言・保存データ形式）を
   変えない。挙動変更を伴う改善は ideas-100.md 上で「見送り」とし理由を残す。
5. **web資産変更時**: `web/sw.js` の `CACHE` 版数を上げる（wave内で1回でよい）。

## 受け入れ基準（全体）

- `npm run verify` 全グリーン（lint / typecheck / typecheck:web / validate:data / test / build:web）
- `npm run test:coverage` の既存閾値（stmts85/branch76/funcs92/lines89）を維持または向上
- 既存の問題データ（data/problems/*.json, web/problems.json）はバイト不変
- ideas-100.md の各項目に「実装タスク」または「見送り理由」が記載されている

## 完了状態（2026-06）

| タスク | ステータス | 主な成果 |
|--------|----------|---------|
| G1 | ✅ 完了・コミット済み | `lib/engine/templates/helpers.ts` 新設。pick/buildChoices/percentage/ensureRange/defineTemplate 一元化 |
| G2 | ✅ 完了・コミット済み | `DENKEN_NARRATOR_MODE` 環境変数・`lib/engine/index.ts` barrel |
| G3 | ✅ 完了・コミット済み | `lib/shared/time.ts`・`lib/shared/rng.ts` 新設。Supabase zod 検証 |
| G4 | ✅ 完了・コミット済み | `web/src/dates.ts`・`web/src/sanitize.ts` 新設。SW 堅牢化 |
| G5 | ✅ 完了・コミット済み | `scripts/shared.ts`・全 --help 対応・validate.yml/release.yml 強化・.npmrc engine-strict |
| G6 | ✅ 完了・コミット済み | app.ts 2,570行→90行。ui/views/state/ 19モジュール分割。挙動不変 |
| G7 | ✅ 完了・コミット済み | tests/helpers/{storage,rng,fixtures}.ts。schema-drift/generate-from-roundtrip テスト。851件 |
| G8 | ✅ 完了（本コミット） | README/CONTRIBUTING/architecture.md 更新。ADR 0001 新設。CHANGELOG 追記 |
| G9 | 🔄 並列実行中 | tsconfig/biome 厳格化・全コード lint 修正 |

`npm run verify` は Wave 1〜2 完了後に全グリーン確認済み（ツリーは verify 全グリーン）。
ideas-100.md の見送り項目（I-050/051/052/089/092 の計6項目）は各行に理由を記載済み。
