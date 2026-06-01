# Changelog

このプロジェクトの主な変更を記録する。形式は [Keep a Changelog](https://keepachangelog.com/ja/1.1.0/)、
バージョニングは [Semantic Versioning](https://semver.org/lang/ja/) に従う。

## [Unreleased]

### Added
- `docs/architecture.md` — モジュール依存グラフ（mermaid）・レイヤ構成・設計不変条件。
- `lib/README.md` — 13モジュールの責務索引表と規約。
- `SECURITY.md` — 脆弱性開示方針と機密情報（APIキー / Supabase RLS）の取扱い注記。
- `.github/CODEOWNERS` — レビュー自動アサイン。
- `.nvmrc` — Node バージョン固定（CI と整合）。
- `package.json` にメタデータ（`repository` / `bugs` / `homepage` / `keywords` / `author`）。
- カバレッジ回帰ゲート（`vitest.config.ts` に閾値、CI で `test:coverage` を実行）。
- PWA アプリアイコン（`web/icon.svg`、maskable 対応）でインストール可能に。
- CI の最小権限化（`permissions: contents: read`）と `setup-node` の npm キャッシュ。
- 公開ゲート(`engine/gate.ts`)のユニットテストと、公開境界の fail-closed テスト。
- `.gitattributes`（LF 正規化 ＋ 生成物の linguist マーキング）。
- `supabase/migrations/0002_problems_updated_at.sql` — `updated_at` を保つ
  BEFORE UPDATE トリガ（関数は `search_path` 固定）。SQL ガードテストも追加。
- 弱点診断の順序非依存を保証する回帰テスト。

### Changed
- `lib/engine/` の X投稿関連を `lib/engine/xpost/`（`toXPost` / `xlength` / `publish` + barrel）に再編。
  生成/検証ロジックと投稿関心事を分離。テストも `tests/engine/xpost/` へミラー移動。

### Fixed
- 型チェックが通らなかった問題を修正（`@types/node` を devDependencies に明示追加）。
- zod v4 移行漏れを修正（`z.record(paramField)` → `z.record(z.string(), paramField)`）。
- 環境変数名の不一致を是正（`supabase-store.ts` の例を `.env.example` と同じ `SUPABASE_ANON_KEY` に統一）。
- README のテスト件数表記がドリフトしていたのを解消（陳腐化する数値を撤去）。
- **公開ゲートの未配線（安全ホール）を是正**: `engine/gate.ts` がどこからも呼ばれず、
  `scheduleProblem` が検証状態に関わらず投稿予約できていた。`meetsValidationGate` を
  公開境界に配線し、検証4項目未充足・`retracted` を fail-closed で拒否するようにした。
- **弱点診断の順序依存バグ**: `aggregateByTopic` が `dueMs` にログ配列末尾の時刻を入れ、
  順不同入力（`order` 未指定の Supabase 取得など）で最新時刻にならず弱点優先度が狂っていた。
  `Math.max` で最新時刻を採用し、`answer_logs.byUser` に `order by answered_at` を追加。

## [0.1.0] - 2026-05-29

### Added
- 問題生成＆検証エンジン MVP（決定論ソルバ＋検算＋出典＋CLI、5科目テンプレ）。
- CI品質ゲート（Biome ＋ 型チェック ＋ ajv スキーマ検証 ＋ vitest）。
- X投稿生成＋予約、解答集計、過去問取込、適応出題（SM-2/FSRS）＋永続化、
  コミュニティ儀式、通知計画、シェアカード／クロスポスト／誤り訂正／週次KPI。
- オフライン学習アプリ MVP（PWA・localStorage・Service Worker）。
- Obsidian/Markdown 書き出し。
- デュアルライセンス（コード=MIT / データ・docs=CC-BY-SA-4.0）。

[Unreleased]: https://github.com/thinkyou0714/denken-os/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/thinkyou0714/denken-os/releases/tag/v0.1.0
