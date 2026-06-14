# リファクタリング計画 第2ラウンド（2026-06）

第1ラウンド（[../ideas-100.md](../ideas-100.md), PR #33/#35）で構造重複・無音エラー・設定の緩みは解消済み。
第2ラウンドは**より深い領域**——ドメイン正当性（電気工学の物理制約）・型の表現力・
アルゴリズム健全性・ランタイム性能・アクセシビリティ完全性・セキュリティ・観測性——を対象に、
3系統の深掘り監査で抽出した**新規100項目**（[ideas-round2.md](./ideas-round2.md), II-101〜II-200）を実装する。

## 第2ラウンドの根本原因（なぜこの軸か）

| # | 根本原因 | 症状 | 対応タスク |
|---|---------|------|-----------|
| RR1 | `defineTemplate` ファクトリの採用が13/87止まり。74テンプレが手書き委譲のまま | 物理制約チェック（効率≤1・力率≤1・ゼロ割・負値）が各テンプレに散在し一元化されない | RG1 |
| RR2 | 型がドメイン不変条件を表現していない（source citation の条件必須、params必須性、optional濫用） | 実行時refineに頼り IDE/コンパイラで検出不能。検証の抜け | RG2 |
| RR3 | 観測性の欠如（生成歩留まり・narrateフォールバック率・診断スコア根拠・段階別エラーが不可視） | 本番の品質劣化に気付けない、デバッグ困難 | RG2/RG3/RG4 |
| RR4 | ランタイム性能（毎描画でO(n)集計・problems.json再パース・タイマーリーク） | ログ増大でUIフリーズ、模試タブ離脱でタイマー残存 | RG4/RG5 |
| RR5 | アクセシビリティと配信の成熟度不足（aria-live欠如・CSP/SRIなし・SW版数手動・SemVer形骸化） | 支援技術非対応・改ざん検知不能・配信事故 | RG5/RG7 |

## フェーズ構成（waveは並列実行単位）

```
Phase 0  計画策定（本書＋ideas-round2.md＋ゴールファイルRG1〜RG8）……このコミット
Phase 1  ドメイン/エンジン/サービス（Wave 1: RG1〜RG4 を並列）
Phase 2  Web/テスト/配信（Wave 2: RG5〜RG7 を並列）
Phase 3  ドキュメント整合（Wave 3: RG8 単独）
各wave末に `npm run verify` 全グリーン＋`build:problems`でweb/problems.jsonバイト一致を確認。
```

### Wave 1 — ドメイン・エンジン・サービス層

| タスク | ゴール | 所有ファイル | 概要 |
|--------|--------|-------------|------|
| RG1 | [goals/RG1-templates-physics.md](./goals/RG1-templates-physics.md) | `lib/engine/templates/**`, `lib/engine/clean.ts`, 新規`lib/shared/constants.ts` | 物理制約ヘルパー一元化＋全テンプレのdefineTemplate移行 |
| RG2 | [goals/RG2-engine-types-observability.md](./goals/RG2-engine-types-observability.md) | `lib/engine/{generate,validate,narrate,schema,gate,index}.ts` | 型の表現力強化（discriminated union）・検証深化・narrate/生成テレメトリ |
| RG3 | [goals/RG3-cli-figures-xpost.md](./goals/RG3-cli-figures-xpost.md) | `lib/engine/cli.ts`, `lib/engine/figures/**`, `lib/engine/xpost/**` | CLI堅牢化・段階別エラー・図ヘルパー・xpost出力制御 |
| RG4 | [goals/RG4-lib-services.md](./goals/RG4-lib-services.md) | `lib/scheduler/**`, `lib/store/**`, `lib/chat/**`, `lib/aggregate/**`, `lib/ingest/**` ほか | スケジューラ根拠明記・診断テスト性・retrieve品質・知識構造・ストア堅牢性 |

### Wave 2 — Web・テスト・配信

| タスク | ゴール | 所有ファイル | 概要 |
|--------|--------|-------------|------|
| RG5 | [goals/RG5-web-perf-state.md](./goals/RG5-web-perf-state.md) | `web/src/*.ts`（view以外）, `web/src/state/**` | メモ化キャッシュ・状態永続・チャットcleanup・quota管理 |
| RG6 | [goals/RG6-web-views-a11y.md](./goals/RG6-web-views-a11y.md) | `web/src/views/**`, `web/src/ui/**`, `web/src/keyboard.ts`, `app.ts`, `app-init.ts` | タイマーリーク解消・aria-live/フォーカス・DOM安全・per-viewエラー境界 |
| RG7 | [goals/RG7-tests-ci-security-data.md](./goals/RG7-tests-ci-security-data.md) | `tests/**`, `vitest.config.ts`, `scripts/**`, `.github/**`, `supabase/migrations/`, `web/{index.html,sw.js,manifest.webmanifest}`, ルート設定 | ファズ/統合/fake-timersテスト・CSP/SRI・SW版数自動化・RLS/FK・CI成熟 |

### Wave 3 — ドキュメント

| タスク | ゴール | 所有ファイル | 概要 |
|--------|--------|-------------|------|
| RG8 | [goals/RG8-docs.md](./goals/RG8-docs.md) | `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CHANGELOG.md`, `docs/**` | 実装反映・テンプレ実装ガイド・ADR・フロー図 |

## 並列実装の運用ルール（全ゴール共通）

1. **ファイル所有権**: 表の所有ファイルのみ変更可。他タスクの所有ファイルはimport利用のみ。
2. **挙動不変**: 生成問題・採点・UI文言・保存データ形式・**web/problems.jsonのバイト列**を変えない。
   挙動変更を伴う改善はideas-round2.mdで「見送り」として理由を残す。
3. **公開API凍結（Wave 1/2）**: 既存exportシグネチャを壊さない（追加は可）。型変更は後方互換な追加のみ。
   既存テストは無変更でグリーン（テスト追加は可）。
4. **検証**: 各タスクは`npx biome check <所有>`＋`npx vitest run <関連>`を回す。全体verifyはwave後にオーケストレータが実施。
5. **web資産変更時**: `web/sw.js`の`CACHE`版数を上げる（RG7がv20へ＋自動化）。

## 受け入れ基準（全体）

- `npm run verify` 全グリーン、`npm run test:coverage`閾値維持/向上、`audit:status:strict`グリーン
- `npm run build:problems`後 `git diff --exit-code web/problems.json` 差分ゼロ
- ideas-round2.mdの各項目に「実装タスク」or「見送り理由」が記載されている
</content>
