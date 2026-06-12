# 改善アイデアカタログ100（深掘り監査 2026-06）

lib/エンジン・web/フロントエンド・tests/CI/設定の3系統の深掘り監査から抽出した100項目。
「対応」列は実装タスク（[plan.md](./plan.md) の G1〜G9）または見送り理由。
重大度: ★★★=構造的/データ保全, ★★=品質/堅牢性, ★=磨き込み。

## A. 問題生成エンジン — テンプレート層（根本原因R2）

| ID | ★ | 内容 | 対応 |
|----|---|------|------|
| I-001 | ★★★ | `pick()` が82テンプレートに同一定義でコピペされている → `templates/helpers.ts` に一元化 | G1 |
| I-002 | ★★ | `pick()` 内の非null断言 `!`（空配列で undefined を隠蔽）→ 共有版に空配列ガードを実装 | G1 |
| I-003 | ★★ | choices/distractors の組み立て（昇順整列・重複排除・理由対応）が各所で手書き → `buildChoices()` ヘルパー | G1 |
| I-004 | ★ | 比率/百分率計算の重複（需要率・電圧降下率・負荷率など15箇所）→ `percentage()` ヘルパー | G1 |
| I-005 | ★★ | 数値整形が3系統（formatKW/formatClean/figures内fmt）→ 役割をJSDocで明確化し相互参照 | G1/G2 |
| I-006 | ★★★ | ε=1e-6 が clean.ts/validate.ts/テンプレ2件の計4箇所に重複 → `ANSWER_EPSILON` を clean.ts から一元提供 | G1/G2 |
| I-007 | ★★ | `isCleanAnswer` の浮動小数比較を数値安定な形（丸め→逆算比較）へ。挙動は維持（生成物バイト一致で担保） | G1 |
| I-008 | ★ | テンプレ定数配列の `readonly`/`as const` 徹底（electric-heating, capacitor-energy 等に漏れ） | G1 |
| I-009 | ★★★ | generate/generateFrom 委譲のボイラープレート → `defineTemplate()` ファクトリを新設し代表テンプレを移行、新規作成の標準形に | G1 |
| I-010 | ★ | `realistic_range` と実際の draw 値の整合を確認する `ensureRange()` ヘルパー（追加的・既存挙動不変） | G1 |
| I-011 | ★★ | 新設ヘルパー群のユニットテスト（空配列・境界・整形）新設 | G1 |
| I-012 | ★ | `Template` インターフェースの null 契約・generateFrom 再現契約を JSDoc で明文化 | G1 |

## B. 問題生成エンジン — コア（generate/validate/narrate/figures/xpost/cli）

| ID | ★ | 内容 | 対応 |
|----|---|------|------|
| I-013 | ★★ | `narrationMatchesAnswer` の数値抽出が指数表記等に弱い → 抽出の頑健化（既存テスト・生成物は不変） | G2 |
| I-014 | ★ | `confidence = 0.9` のハードコード → 定数化し根拠コメント（minConfidence 比較の意味も明記） | G2 |
| I-015 | ★ | `CorruptingNarrator` の用途（負例テスト用）をコードコメントと使用箇所で明確化 | G2 |
| I-016 | ★★ | `defaultNarrator()` の暗黙の環境判定 → `DENKEN_NARRATOR_MODE=auto\|stub\|api` で明示制御可能に | G2 |
| I-017 | ★ | ナレーターモデル名の既定値を定数抽出し `.env.example` に記載 | G2/G5 |
| I-018 | ★★ | `lib/engine/index.ts` barrel 新設（generate/validate/templates の単一入口） | G2 |
| I-019 | ★ | `figures/` の局所 `fmt()` の役割コメントと clean.ts 系との関係明記 | G2 |
| I-020 | ★ | cli/xpost のエラー出力に文脈（どのtopic/段階で失敗か）を付与 | G2 |

## C. lib その他（scheduler/store/chat/aggregate ほか — 根本原因R3/R4）

| ID | ★ | 内容 | 対応 |
|----|---|------|------|
| I-021 | ★★★ | `86_400_000` 直書きが notify/schedule.ts・scheduler/diagnosis.ts に残存 → `lib/shared/time.ts` に時間定数を一元化 | G3 |
| I-022 | ★★★ | supabase-store の行→ドメイン変換が無検証キャスト8箇所 → zod スキーマでパース検証 | G3 |
| I-023 | ★★ | supabase-store のエラーが生メッセージ連結 → 操作名付きの一貫したエラーラッパ | G3 |
| I-024 | ★★ | `createSupabaseStores(url, key)` の空文字チェック（早期失敗） | G3 |
| I-025 | ★★ | file-store `readJson` が ENOENT と JSON破損を同一視 → 破損時は console.warn で検知可能に | G3 |
| I-026 | ★ | aggregate の votes/choices 長さ不一致を黙って切り捨て → 警告ログ | G3 |
| I-027 | ★ | SM-2 ease に上限が無い設計意図をコメント化（テストで保証は G7） | G3/G7 |
| I-028 | ★ | chat/knowledge.ts(785行) に科目別の目次コメントを整備（分割はデータ凝集性を優先し見送り） | G3 |
| I-029 | ★ | store/index.ts の Store インターフェースに JSDoc（実装間の契約） | G3 |
| I-030 | ★ | notify/schedule の試験日当日・過去日の境界挙動をコメント明文化 | G3 |
| I-031 | ★ | types/node-lite.d.ts の存在理由（@types/node との関係）をファイル冒頭に明記 | G3 |
| I-032 | ★ | x-client のタイムアウト/リトライ方針の定数化とコメント | G3 |
| I-033 | ★★ | seeded RNG (xorshift) が scripts と tests に重複 → `lib/shared/rng.ts` に一元化 | G3/G5/G7 |

## D. Web — 共有ユーティリティ・状態・PWA・ビルド（根本原因R3/R4/R5）

| ID | ★ | 内容 | 対応 |
|----|---|------|------|
| I-034 | ★★★ | `JST_OFFSET_MS`/日番号計算が quests/retention/dashboard/app の4箇所に重複 → `web/src/dates.ts` 新設 | G4(+G6) |
| I-035 | ★★★ | localStorage 保存失敗（quota/プライベートモード）が完全に無音 → `lastPersistError` で検知可能にしUIでトースト表示 | G4(+G6) |
| I-036 | ★★ | localStorage 破損 JSON の読み込み失敗が無音 → console.warn で診断可能に | G4 |
| I-037 | ★★ | 図SVGの innerHTML 挿入に防御がない → `sanitizeSvg()`（script/on*属性/外部参照の拒否）を新設し適用 | G4(+G6) |
| I-038 | ★★ | SW: `addAll` 失敗時も `skipWaiting()` が走る競合 → プリキャッシュ成功後にのみ skipWaiting | G4 |
| I-039 | ★★ | SW: 未キャッシュ&オフライン時に応答なし → ナビゲーションはキャッシュ済み `./` へフォールバック | G4 |
| I-040 | ★ | SW: CACHE 版数を v19 へ（本リファクタの配信） | G4/G6 |
| I-041 | ★ | index.html に `meta description` が無い | G4 |
| I-042 | ★★ | ダークテーマの `--muted` (#9aa4b6) が小さい文字で WCAG AA 境界 → コントラスト改善 | G4 |
| I-043 | ★ | 数値入力の `:invalid` 視覚フィードバック CSS | G4 |
| I-044 | ★ | build-web にビルドサイズ/gzip レポート（性能回帰の可視化） | G4 |
| I-045 | ★ | build-web に sourcemap 整合検証（sources 空でないこと） | G4 |
| I-046 | ★ | build-web の esbuild 失敗時にエラー位置を整形表示 | G4 |
| I-047 | ★ | importBackup のバージョン不一致時メッセージを将来バージョンに備えて改善 | G4 |
| I-048 | ★ | mascot.ts 等「信頼済みSVG」経路にも sanitizeSvg の適用とコメント | G4 |
| I-049 | ★ | web/src 各モジュールの公開関数に JSDoc 補完 | G4 |
| I-050 | — | ハッシュ付きアセット名（app-[hash].js） | 見送り: SW版数運用と二重管理になる。SW更新フローが既にキャッシュ破棄を担う |
| I-051 | — | XState/immer による状態機械化 | 見送り: 依存追加なし方針。I-055 の typed state 分離で根本対応 |
| I-052 | — | problems.json の定期再取得ポーリング | 見送り: SW 更新フローが配信を担う。常時ポーリングはオフライン第一方針と不整合 |

## E. Web — app.ts モノリス分割（根本原因R1）

| ID | ★ | 内容 | 対応 |
|----|---|------|------|
| I-053 | ★★★ | app.ts(2,570行) を `ui/`（DOMヘルパー・部品）, `views/`（タブ7画面）, `state/`（アプリ状態）へ分割。挙動・文言・DOM構造は不変 | G6 |
| I-054 | ★★★ | `renderDashboard`(281行)・`renderExamResult`(126行)・`finalize`(99行) のセクション関数分解 | G6 |
| I-055 | ★★ | 10個超のトップレベル可変変数 → 画面別の typed state モジュールに整理 | G6 |
| I-056 | ★★ | `h()` の `html` 属性が無条件 innerHTML → 分割時に `html` 経路を formatMath/sanitizeSvg 済みに限定する規約をコード上で強制 | G6 |
| I-057 | ★★ | タブ切替/ルーティングを `views/router.ts` に独立 | G6 |
| I-058 | ★ | キーボードヘルプに `aria-modal`・Escape・フォーカス返却（フォーカストラップ） | G6 |
| I-059 | ★ | チャット連投ガード（最小送信間隔1秒） | G6 |
| I-060 | ★ | グローバルエラートーストの自動消滅（残留による混乱防止） | G6 |
| I-061 | ★ | problems.json 読込時の軽量ランタイム検証（配列・必須フィールド） | G6 |
| I-062 | ★ | 分割に伴う dead code 点検（tipIndex・pool 残留パス等） | G6 |

## F. テスト基盤（重複根絶と網の補強）

| ID | ★ | 内容 | 対応 |
|----|---|------|------|
| I-063 | ★★★ | `MemoryStorage` が8テストファイルに重複定義 → `tests/helpers/storage.ts` | G7 |
| I-064 | ★★★ | seeded RNG が6テストファイルに重複 → `tests/helpers/rng.ts`（lib/shared/rng.ts を利用） | G7 |
| I-065 | ★ | `ThrowingStorage`（quota超過系）を共有ヘルパー化し他のストレージテストでも利用 | G7 |
| I-066 | ★ | フィクスチャパス解決ヘルパー（data/problems への直書きパス排除） | G7 |
| I-067 | ★★★ | 全テンプレートで「generate の params を generateFrom に渡すと同一結果」になる再現性プロパティテスト | G7 |
| I-068 | ★★ | `isCleanAnswer` のスケール別（1/100/10^4/10^6）回帰テスト | G7 |
| I-069 | ★★★ | zod スキーマと problem-schema.json(ajv) の二重定義ドリフト検知テスト（52データファイルを両方で検証し一致を確認） | G7 |
| I-070 | ★★ | validate-problems/export-vault の失敗系テスト（G5 で抽出した純関数に対して） | G7 |
| I-071 | ★★ | 時刻依存テストへの `vi.useFakeTimers` 適用（JST 日境界の偶発失敗防止） | G7 |
| I-072 | ★★ | G1/G3/G4 で新設した共有ヘルパーのテスト補完 | G7 |
| I-073 | ★ | カバレッジ閾値を実測に合わせ可能なら床上げ | G7 |
| I-074 | ★ | 弱いアサーションの強化（new-templates に物理不変条件: 効率≦1・電力>0 等を追加） | G7 |

## G. スクリプト（運用堅牢化）

| ID | ★ | 内容 | 対応 |
|----|---|------|------|
| I-075 | ★★ | `--help` 整備（audit-status/seed-data-problems/build-problems） | G5 |
| I-076 | ★ | build-problems の `PER_TOPIC` を `--per-topic` フラグ化（既定10は不変） | G5 |
| I-077 | ★★ | 生成物書き込みの原子化（tmp+rename）ヘルパーで途中クラッシュの半端ファイル防止 | G5 |
| I-078 | ★★ | validate-problems の AJV `strict: false` 見直し（strict 化、不可なら理由を明記） | G5 |
| I-079 | ★ | スクリプト間で重複する「検証して失敗なら exit」処理の共通化 | G5 |
| I-080 | ★ | export-vault の書込失敗（権限/容量）ハンドリング | G5 |
| I-081 | ★ | validate-problems のエラーにファイルパス文脈を徹底 | G5 |
| I-082 | ★ | スクリプトのテスト可能化（main と純関数の分離。テスト追加は G7） | G5 |

## H. CI/CD（配信と品質ゲート）

| ID | ★ | 内容 | 対応 |
|----|---|------|------|
| I-083 | ★★ | validate.yml: coverage レポートと web/dist をアーティファクト保存（傾向追跡・調査用） | G5 |
| I-084 | ★★ | deploy-pages の `cancel-in-progress: true` がコメント「キャンセルしない」と矛盾 → 意図（直列・中断なし）に合わせ false | G5 |
| I-085 | ★ | validate.yml の concurrency コメントを実挙動（新push時に旧実行キャンセル）に正す | G5 |
| I-086 | ★★★ | GitHub Actions の SHA ピン留め → renovate `helpers:pinGitHubActionDigests` で自動化（手書きSHAの転記ミスを排除） | G5 |
| I-087 | ★★ | release.yml 新設（タグ push で `release:check` 実行 → GitHub Release 草稿作成） | G5 |
| I-088 | ★ | dependency-review / secrets-scan の permissions・timeout 点検 | G5 |
| I-089 | — | CI の Node バージョンマトリクス（20/22） | 見送り: 運用は .nvmrc=22 固定。CI時間倍増に見合わない |
| I-090 | ★ | カバレッジ要約を `GITHUB_STEP_SUMMARY` に出力 | G5 |
| I-091 | ★★ | validate.yml が全ブランチ push × PR で二重実行 → push は main のみに限定 | G5 |
| I-092 | — | husky/pre-commit フック導入 | 見送り: CI が既にゲート。依存とフック強制は貢献障壁。CONTRIBUTING に `npm run verify` を明記（G8） |

## I. 設定・データ・ドキュメント

| ID | ★ | 内容 | 対応 |
|----|---|------|------|
| I-093 | ★★ | tsconfig 厳格化: `noImplicitReturns`/`noFallthroughCasesInSwitch` 追加、`exactOptionalPropertyTypes` は影響評価の上で判断 | G9 |
| I-094 | ★★★ | biome の `noExplicitAny`/`noNonNullAssertion` off を解除し全違反修正（根本原因R5） | G9 |
| I-095 | ★ | `.npmrc` に `engine-strict=true`（.nvmrc=22 と engines の整合を README に明記） | G5 |
| I-096 | ★ | `.env.example` の既定値明記（DENKEN_NARRATE_MODEL ほか、G2 の DENKEN_NARRATOR_MODE 追記） | G5 |
| I-097 | ★ | .gitattributes の linguist 区分（手書き T-0001〜0003 と生成データの区別） | G5 |
| I-098 | ★★ | supabase migration 0002: `answer_logs.problem_id` インデックス等の追補 | G5 |
| I-099 | ★ | ADR 新設: zod と problem-schema.json の二重スキーマ意図（CI=ajv/実行時=zod） | G8 |
| I-100 | ★★ | README/CONTRIBUTING/architecture.md の最新化（verify の説明・build:web 手順・分割後のweb構成図・CHANGELOG 追記） | G8 |

## 集計

- 実装: 94項目（G1: 12 / G2: 8 / G3: 13 / G4: 16 / G5: 17 / G6: 10 / G7: 12 / G8: 2 / G9: 2 ＋ 複数タスク跨ぎ重複分）
- 見送り: 6項目（I-050, I-051, I-052, I-089, I-092 ＋ 理由は各行に記載）
- 監査で挙がったが採用しなかった案（抜粋）: RLSのモックテスト（モックではRLSを検証できない）、
  アイコンPNG多サイズ化（バイナリ資産はデザイン作業が必要）、模試タイマーのrAF化（バックグラウンドタブで停止し逆効果）、
  Codecov等外部サービス連携（外部依存を増やさない）。

## 実装結果注記（2026-06 Wave 1〜3 完了）

### G8 担当（I-099, I-100）の実装結果

**I-099 — ADR 新設**: `docs/adr/0001-dual-schema-validation.md` を新設。
Context（二重定義の背景）/ Decision（zod = 型の真の定義・ajv = 外部公開仕様、ドリフトはテストで検知）/
Consequences（プラス面・リスク・手順）の構成で記述。
ドリフト検知テスト `tests/engine/schema-drift.test.ts` へのリンクを含む。

**I-100 — README/CONTRIBUTING/architecture.md 最新化**: 以下を反映した。
- `README.md`: `npm run verify` の説明（CI と同一のプリプッシュ確認）をスクリプト表に追記。
  `--per-topic`/`--help` フラグと環境変数（`DENKEN_NARRATOR_MODE` 等）の説明を追加。
  `web/src/` 新構成（ui/views/state 分割後）を図付きで記載。
  Node 要件（.nvmrc=22, engines>=20, engine-strict=true）の注記を追加。
  テスト件数を 604→851 件に更新。
- `CONTRIBUTING.md`: dev セットアップに `npm run build:web` と `npm run verify` を明記（I-092 の代替）。
  Node バージョン要件の注記。
- `docs/architecture.md`: `lib/shared/` 層の追加・`templates/helpers.ts` の記載・web/src 構成の更新。
  依存グラフを mermaid で更新（shared 層を含む正確な依存関係）。
  検証パイプラインに 851件・カバレッジ閾値・アーティファクト保存・release.yml を追記。
  スクリプトフラグ一覧テーブルを新設。
  `schema-consistency.test.ts` の誤記を `schema-drift.test.ts` に修正。
- `CHANGELOG.md`: Keep a Changelog 形式で Wave 1〜3 の変更エントリを先頭に追加。
  「変更なし: 生成問題データ・保存データ形式・UI挙動」を明記。
- `docs/refactoring/plan.md`: 完了状態テーブル（G1〜G9）を追記。

### こぼれた項目（見送り扱いに移す）

なし。G8 の実装範囲（I-099, I-100）は全て対応完了。
