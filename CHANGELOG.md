# Changelog

このプロジェクトの主な変更を記録する。形式は [Keep a Changelog](https://keepachangelog.com/ja/1.1.0/)、
バージョニングは [Semantic Versioning](https://semver.org/lang/ja/) に従う。

## [Unreleased]

### Added
- **過去問頻出テーマのテンプレ拡充（29→50種・全6科目を網羅）**: 計測(分流器/倍率器)・
  電界・%Z容量換算・揚水/巻上/照明動力・風圧/許容張力・電圧降下率/負荷率/不等率/送電効率・
  最大効率負荷率・直流発電機・磁気エネルギー・電力量・全波整流・昇圧チョッパ・
  送電電力(安定度)・短絡電流(オーム法) 等。各々を固定値検算テストで担保（全テンプレ歩留まり≥20）。
- **図解と構造化解説（電験王のような図式を織り込む）**:
  - `lib/engine/figures/` — 外部依存なしの**インラインSVG**描画基盤（プリミティブ＋12トピックの
    図ビルダー）。回路図（三相Y/直並列/RC/最大電力/ブリッジ/変圧器）、ベクトル図（電力三角形/
    同期発電機）、線路図（単相電圧降下）、ブロック線図（一次遅れ系）、特性曲線（比例推移）。
    `currentColor`でテーマ追従、`<title>`/`role=img`でアクセシブル。
  - `GenerationResult.figure`→`Problem.figure` を生成/seed/build 全経路に配線。学習・模試で図を描画。
  - 解説を主要トピックで「着眼点→公式→代入→計算→ポイント/別解」に構造化。
  - problems.json 96問・data 12問を図付きに再生成。図スモークテスト12件。Service Worker v6。
  - `docs/strategy/ideas/07-figures-explanations-100.md` — 図式・解説の深掘り100。
- **学習エンジンの大幅強化（電験二種 合格力に直結する深掘り100の実装）**:
  - エンジン: 決定論テンプレートを **7→29種** に拡充（全6科目・**二次=記述8種**）。
    閉形式の固定値検算テスト22件＋科目カバレッジ検証。
  - データ: `scripts/build-problems.ts`（`npm run build:problems`）で全テンプレから
    **220問**を決定論生成し `web/problems.json` を再構築（記述69問・全件 validate 通過）。
  - 記憶: Web の復習を **SM-2→FSRS** に移行し、**4段階自己評価**（again/hard/good/easy）と
    目標保持率設定を導入。FSRS Card を localStorage に永続化（Date 復元込み）。
  - 学習機能: タブ型SPA（**学習/復習/模試/進捗/公式/設定**）。時間制限模試（合格ライン60%・
    科目別内訳）、復習キュー、**間違いノート**、科目別到達度ダッシュボード、試験カウントダウン、
    日次目標、公式集、科目ドリル、**数式の軽量整形**（KaTeX非依存）、キーボード操作、aria-live。
  - 純ロジック（`web/src/{dashboard,exam,review,plan,settings,mathfmt}.ts`）に**ユニットテスト49件**。
  - ドキュメント: `docs/strategy/exam-structure.md`（試験構造＋学習科学に基づく学習法）と
    `docs/strategy/ideas/06-exam-mastery-100.md`（学習エンジン強化の深掘り100）。
  - Service Worker を v4 に更新。`npm run verify` 緑（255テスト）。
- `docs/strategy/ideas/05-deep-audit-2026-06.md` — コードベース深掘り監査100（根本原因×ベストプラクティス、対応状況付き）。
- `web/src/grade.ts` — 採点の純ロジック（DOM から分離してテスト可能化）。numeric は数値比較、選択式/記述は厳密一致。
- `web/src/select.ts` — 出題選択の純ロジック（弱点 topic 優先＋直近出題の重複回避）。テスト付き。
- `AnswerLog.problemId`（任意）— 問題単位の集計の素地。web `record`・supabase append/byUser に配線。
- 全7テンプレートの不変条件テスト（`tests/engine/template-invariants.test.ts`、多数 seed で params レンジ内・
  選択肢一意・綺麗な値・解説整合を横断検証）。aggregate/classify 閾値/select/problemId のテストも追加。
- 採点・JST境界・通知時刻・週次重複・CLI検証・PII拒否のユニットテスト。
- `narrate` / `cli`（parseArgs/argErrors/makeRng）/ `supabase-store`（疑似クライアントで3ストア＋error伝播）/
  `fsrs`（4採点）/ `x-client`（下書き）/ `narrationMatchesAnswer` のテストを追加し、カバレッジ回帰フロアを
  stmts75→85 / branch65→76 / funcs80→92 / lines80→89 に引き上げ。
- CLI に `--help`/`-h` と USAGE、引数検証（`--count`/`--source`/`--citation`/`--seed`）。
- CI の checkout に `persist-credentials: false`、各ジョブに `timeout-minutes`。
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
- `lib/engine/cli.ts` を**直接実行時のみ `main()`**（`import.meta.url` 判定）に。import しても副作用が出ず
  テスト可能に。`parseArgs`/`argErrors`/`makeRng` をエクスポート。
- `lib/store/file-store.ts` の書き込みを**原子的**（temp＋`rename`）にし、クラッシュ/並行時の JSON 破損を防止。
- `actions/checkout` を v6 に統一。dependency-review の `fail-on-severity` を high→moderate に厳格化。
- `lib/correction/classify.ts` の判定閾値を引数化（`DEFAULT_THRESHOLD`、実データで較正可能）。
- `web/sw.js` のキャッシュ版を v2→v3（web アセット変更時に既存 PWA クライアントへ確実に配信。版数の更新規約をコメント化）。
- テンプレ文の文字列連結（`+`）をテンプレートリテラルに統一（lint info 一掃。生成文字列は不変）。
- `lib/engine/` の X投稿関連を `lib/engine/xpost/`（`toXPost` / `xlength` / `publish` + barrel）に再編。
  生成/検証ロジックと投稿関心事を分離。テストも `tests/engine/xpost/` へミラー移動。

### Fixed
- **オフラインアプリの numeric 採点バグ**（`web/src/app.ts`）: 文字列完全一致で `"50"≠"50.0"`・`"3.2"≠"3.20"`・
  全角数字が誤判定されていた。numeric を数値の許容誤差比較に是正し、入力正規化（全角/桁区切り/空白）を追加。
- **ストリーク/学習時間の日境界が UTC**（`web/src/store.ts`）: 朝(JST)の学習が前日扱いで連続日数が途切れていた。
  既定 JST(+9h)・設定可能な日境界に是正。
- **通知時刻 `parseHHMM` の NaN**（`lib/notify/schedule.ts`）: `"20:xx"` 等で `setHours(NaN)` になりうる箇所を
  範囲検証＋既定フォールバックに。
- **週次レビューの TOP/FLOP 重複**（`lib/analytics/weekly-review.ts`）: 投稿数が少ない週に同一投稿が両セクションへ。
  TOP を除外して FLOP を選ぶよう是正。
- **シェアカードの PII 未配線**（`lib/share-card/card-text.ts`）: `hasPii` を `cardText` 本体に配線し
  メール/電話の混入を拒否。
- **vault 書き出しが無検証**（`scripts/export-vault.ts`）: `validateProblem` で不正な問題を除外＋警告。
- **numeric採点の空入力バグ**（`web/src/grade.ts`）: `Number("")===0` のため答えが `"0"` の問題で空回答が
  正解扱いになりうる箇所を、正規化後が空なら不正解として弾くよう是正（Codex レビュー指摘）。
- **集計の votes/choices 長不一致**（`lib/aggregate/aggregate.ts`）: 既知選択肢に対応する票だけで集計する防御に。
- **supabase の `answer_logs.problem_id` を常に null 保存**していたのを `problemId` 保存に是正。
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
