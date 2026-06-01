# DENKEN-OS

> 電験 (電気主任技術者試験) の合格を「再現性のある学習プロセス」として体系化するプロジェクト

## Status

**Pre-alpha — コア実装着手** (2026-05-29)

問題生成＆検証エンジン (MVP)・運用ロジック・CI品質ゲート・オフラインWeb MVPを実装済み。
現時点で本番接続していないものは、X実投稿・外部Supabaseプロジェクト・課金・監修フロー・大規模問題データ。
実運用前の人間タスクは [`docs/strategy/human-tasks.md`](docs/strategy/human-tasks.md)、品質ハードニング方針は [`docs/strategy/03-quality-hardening-plan.md`](docs/strategy/03-quality-hardening-plan.md) に分離した。
進捗を追いたい方は Watch / Star してください。

### 実装済み（`lib/` `scripts/` `.github/`）

| 領域 | 実装 | 仕様 |
|---|---|---|
| 問題生成＆検証エンジン | `lib/engine/`（決定論ソルバ＋検算＋出典＋CLI、テンプレ7種＝5科目: 理論/電力/機械/法規/機械制御。MC＋numeric＋descriptive形式） | `docs/automation/01` |
| CI品質ゲート | `.github/workflows/validate.yml` ＋ `scripts/validate-problems.ts`（ajv）＋ Biome ＋ 型チェック ＋ `npm run verify` | `docs/automation/09` |
| アプリのデプロイ | `.github/workflows/deploy-pages.yml`（main マージで `web/` を GitHub Pages へ自動公開） | README ビジョン |
| X投稿生成＋予約 | `lib/engine/toXPost.ts`＋`xlength.ts`（重み付き280字・自動スレッド）＋`publish.ts`（poll併設・朝→夜引用） | `docs/automation/02` |
| 解答集計 | `lib/aggregate/`（poll→正答率・最頻誤答・難易度提案） | `docs/automation/03` |
| 過去問取込 | `lib/ingest/`（出典メタ必須・原典/生成分離・重複検出・要手修正フラグ） | `docs/automation/04` |
| 適応出題＋永続化 | `lib/scheduler/`（SM-2＋FSRS＋弱点診断）＋`lib/store/`（インメモリ/JSONファイル/**Supabase実装**）＋`supabase/migrations`（RLS付きDDL） | `docs/automation/05` |
| コミュニティ儀式 | `lib/community/`（チェックイン・出戻り歓迎・卒業ロール） | `docs/automation/08` |
| 通知計画 | `lib/notify/`（頻度制御・オプトアウト・ジッター・試験カウントダウン） | `docs/automation/12` |
| シェアカード文言 / クロスポスト / 誤り訂正 / 週次KPI・UTM計測 | `lib/share-card` `lib/crosspost` `lib/correction` `lib/analytics`（`utm.ts`） | `docs/automation/06,07,10,11` |
| **オフライン学習アプリ MVP** | `web/`（PWA・localStorage・SM-2弱点出題・解説・記録/シェア。esbuild バンドル・Service Worker） | README ビジョン |
| Obsidian/Markdown 書き出し | `lib/export/markdown.ts` ＋ `scripts/export-vault.ts`（vault レイアウト） | README ビジョン |

> ハルシネーション根本対策: **正解は LLM に出させずコードで算出**、最後に解説の数値と照合（不一致は破棄）。
> X 実投稿は無料API枠廃止(2026/2)＋凍結回避のため**既定で下書きエクスポート**（`lib/clients/x-client.ts`）。出題には poll を併設し、集計の一次ソースにする。
> 日本語は1文字=2カウントで280字を超えやすいため、投稿は重み付き長で自動スレッド分割。
> `problem-schema.json`(ajv) と zod 定義の**ドリフトをテストで検知**。Supabase スキーマは RLS 付きで `supabase/migrations/` に DDL を用意（実投稿/永続化の実体は認証取得後にアダプタ接続）。
> 二次=記述(descriptive)は自動採点せず**自己採点**（模範解答＋採点観点を提示）。`data/problems/` に手検算済みの validated 問題（T-0001〜0003）を収録。
> アプリ公開手順: Settings → Pages → Source = "GitHub Actions" にすると、main マージで自動デプロイされる。

### 使い方

```bash
npm install
npm run gen -- --topic 三相交流電力 --count 5            # 問題を生成（JSON を標準出力）
npm run gen -- --topic 誘導電動機の回転速度 --count 5     # 他: 直並列合成抵抗 / コンデンサの静電エネルギー(numeric)
npm run gen -- --topic 三相交流電力 --count 5 --xpost    # 朝/夜の投稿スレッドも表示
npm run validate:data                                     # data/ の問題を schema 検証（CIと同じ）
npm run export:vault -- --out out/vault                   # 問題を Obsidian Markdown に書き出し
npm run build:web                                         # オフライン学習アプリをバンドル → web/dist/
npm run lint                                              # Biome（lint + format チェック）
npm run typecheck && npm run typecheck:web               # 型チェック
npm run verify                                            # CI相当の一括検証
npm test                                                  # ユニットテスト（99件）
```

引数なしの `npm run gen` で利用可能な topic 一覧を表示。

`ANTHROPIC_API_KEY` があれば解説文を Claude で言い回し生成、無ければ決定論スタブで動作（数値はどちらもコード算出で同一）。

### オフライン学習アプリ（`web/`）

`npm run build:web` 後、`web/` を静的配信（例 `npx serve web`）すると、ブラウザで「今日の一問」を解けます。
弱点 topic を優先出題し、解答→即解説、SM-2 で記憶状態を localStorage に保存。Service Worker により**オフラインでも動作**します（バックエンド不要）。`web/problems.json` は自動生成のデモ問題（未監修）。

## Vision

電験三種・二種を独学で合格するための学習 OS。一度合格した知見を、次の受験者が再利用できる形で体系化することを目指します。

- 過去問データベース + 解説 markdown
- 弱点分野の自動診断 + 問題自動生成 (Claude API)
- 学習進捗の可視化 (Supabase で記録、Next.js でダッシュボード)
- Obsidian vault 形式でも配布 (個人学習者が手元で展開可能)
- n8n で過去問・解説の取り込み自動化

## Predicted stack

- **Frontend**: Next.js 16 (App Router) + shadcn/ui
- **Backend**: Supabase (Auth + Postgres + Storage)
- **Payment**: Stripe (会員制を想定)
- **AI**: Claude API (問題生成・解説) + Ollama (オフライン QA)
- **Source format**: Obsidian markdown (画像 / 数式 / 回路図対応)
- **Automation**: n8n (問題集 import / リマインダー)

## Roadmap (tentative)

| Milestone | Target | Status |
|---|---|---|
| M0 README + vision | 2026-05 | done |
| M0.5 Core engine / offline MVP | 2026-06 | in progress（問題生成・検証・PWA・Supabase DDLは実装済み） |
| M1 validated問題データ拡充 | 2026-06 | next（T-0001〜0003のみ validated） |
| M2 実Supabase/Auth接続 + 監修フロー | 2026-07 | not started |
| M3 βテスター向け運用 | 2026-08 | not started |
| M4 公開ベータ (無料 trial) | 2026-Q4 | not started |

## 情報発信・戦略ドキュメント

プロダクトと並行して進める情報発信の戦略・調査結果・運用・自動化の実装指示は
[`docs/`](docs/README.md) に体系的にまとめてある。

- [`docs/strategy/`](docs/strategy/) — コンセプト（凡人成り上がり）・図解・ロードマップ・評価・品質ハードニング・調査アイデア計400
- [`docs/x-strategy/`](docs/x-strategy/README.md) — X発信の運用パッケージ（コピペ可のテンプレ／問題スキーマ）
- [`docs/automation/`](docs/automation/README.md) — 自動化の実装指示（未実装のタスク仕様）

ポジションは「凡人が電験二種に挑む当事者 × 学習アプリ開発 × 共闘」。
「今日の一問」をエンジンにアプリの成長へ繋げる。品質保証・著作権・持続性の根本対策まで織り込み済み。

## License

デュアルライセンス（[`LICENSES.md`](LICENSES.md) に詳細）:
- ソースコード（`lib/`, `scripts/`）= **MIT**（[`LICENSE`](LICENSE)）
- 問題データ（`data/`）／ドキュメント（`docs/`）= **CC-BY-SA-4.0**（[`LICENSE-DATA`](LICENSE-DATA)）
- 過去問由来データは `source.type` で出自を区別し、原著作の利用条件に従う（CC-BY-SA は原著作者の権利を上書きしない）。

## Contact

- GitHub Issues / Discussions (このリポ)
- 関連リポ: [thinkyou0714](https://github.com/thinkyou0714)

## Why "DENKEN"

「電験」のローマ字。学習 OS は「電験合格までのアルゴリズム化」を目指す思想を持つため、試験名そのものをプロダクト名に採用。
