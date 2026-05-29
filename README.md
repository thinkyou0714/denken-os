# DENKEN-OS

> 電験 (電気主任技術者試験) の合格を「再現性のある学習プロセス」として体系化するプロジェクト

## Status

**Pre-alpha — コア実装着手** (2026-05-29)

問題生成＆検証エンジン (MVP)・運用ロジック・CI品質ゲートを実装済み。
アプリ UI / 実投稿 / 永続化は認証取得後（[`docs/strategy/human-tasks.md`](docs/strategy/human-tasks.md)）に接続する。
進捗を追いたい方は Watch / Star してください。

### 実装済み（`lib/` `scripts/` `.github/`）

| 領域 | 実装 | 仕様 |
|---|---|---|
| 問題生成＆検証エンジン | `lib/engine/`（決定論ソルバ＋検算＋出典＋CLI） | `docs/automation/01` |
| CI品質ゲート | `.github/workflows/validate.yml` ＋ `scripts/validate-problems.ts`（ajv） | `docs/automation/09` |
| X投稿テキスト生成 | `lib/engine/toXPost.ts`（朝/夜・ジッター・出典・URL検査） | `docs/automation/02` |
| 解答集計 | `lib/aggregate/`（poll→正答率・難易度提案） | `docs/automation/03` |
| 適応出題 | `lib/scheduler/`（SM-2 ＋ FSRS ＋ 弱点診断） | `docs/automation/05` |
| シェアカード文言 / クロスポスト / 誤り訂正 / 週次KPI | `lib/share-card` `lib/crosspost` `lib/correction` `lib/analytics` | `docs/automation/06,07,10,11` |

> ハルシネーション根本対策: **正解は LLM に出させずコードで算出**、最後に解説の数値と照合（不一致は破棄）。
> X 実投稿は無料API枠廃止(2026/2)＋凍結回避のため**既定で下書きエクスポート**（`lib/clients/x-client.ts`）。

### 使い方

```bash
npm install
npm run gen -- --topic 三相交流電力 --count 5            # 問題を生成（JSON を標準出力）
npm run gen -- --topic 三相交流電力 --count 5 --xpost    # 朝/夜の投稿テキストも表示
npm run validate:data                                     # data/ の問題を schema 検証（CIと同じ）
npm test                                                  # ユニットテスト
```

`ANTHROPIC_API_KEY` があれば解説文を Claude で言い回し生成、無ければ決定論スタブで動作（数値はどちらもコード算出で同一）。

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
| M0 README + vision | 2026-05 | このコミット |
| M1 過去問 1 年分を Obsidian markdown 化 | 2026-06 | not started |
| M2 Next.js skeleton + Supabase schema | 2026-07 | not started |
| M3 弱点診断 prototype | 2026-08 | not started |
| M4 公開ベータ (無料 trial) | 2026-Q4 | not started |

## 情報発信・戦略ドキュメント

プロダクトと並行して進める情報発信の戦略・調査結果・運用・自動化の実装指示は
[`docs/`](docs/README.md) に体系的にまとめてある。

- [`docs/strategy/`](docs/strategy/) — コンセプト（凡人成り上がり）・図解・ロードマップ・評価・調査アイデア計400
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
