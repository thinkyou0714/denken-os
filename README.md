# DENKEN-OS

> 電験 (電気主任技術者試験) の合格を「再現性のある学習プロセス」として体系化するプロジェクト

## Status

**Alpha — 類題生成エンジン プロトタイプ実装** (2026-05)

電験二種 二次試験向けの **パラメトリック類題生成エンジン** (Python) を実装しました。
計算問題は SymPy で厳密に解き、図 (単線図・フェーザ図) はパラメータから自動生成、
論説問題は rubric で品質を検証します。生成エンジンは差し替え可能で、オフライン stub と
ローカル Ollama の双方に対応します。

### Quickstart

```bash
python -m venv .venv && . .venv/bin/activate
pip install -e ".[figures,schedule,dev]"

denken list                                   # 分野とテンプレート一覧
denken gen --template pm_vdrop_3ph --seed 1   # 類題を生成 (generated/ に md+json+svg)
denken gen --template pm_vdrop_3ph --seed 1 --difficulty exam   # 難易度variantで生成
denken gen --template th_rlc_series --seed 3 --mcq              # 五肢択一(一次向け)
denken gen --template pm_vdrop_3ph --seed 1 --backend ollama --model qwen2.5:14b
denken set --count 20 --out problemset        # 重複しない問題セット(模試/問題集)
denken set --count 20 --difficulty exam        # 難易度を揃えたセット
denken set --exam 2ji                          # 二次本番構成(電力管理4+機械制御2)
denken check                                  # 全テンプレを複数 seed で検証
pytest -q                                      # テスト
```

### 設計の要点

- **正答保証**: 答えは SymPy solver が確定。LLM には計算させず文章整形のみ担当 (算術ミスを構造的に排除)。
- **図⇔数値の一致**: 図は solver と同じパラメータから描くため、図・数値・答えが常に整合。
- **再現性**: seed 固定でパラメータ・答え・図を完全再現(同 seed は byte-identical な JSON、内容は `content_hash` で検証)。
- **品質検証**: 計算問題は再計算と突合＋妥当範囲チェック、論説は rubric 充足率で採点。
- **単位・次元検証**: pint で解答式の次元と宣言単位の整合をオーサリング時に検証 (`denken check`)。
- **数値グラウンディング**: 文中の数値が solver 値で説明できるか照合し、LLM の数値捏造を検知。
- **回帰防止**: ゴールデン(スナップショット)テストで意図しない出力変化を検出。
- **記述式の採点基準**: 計算問題に配点(立式/代入/計算/単位)を付与し、部分点を明示。
- **よくある誤り**: √3 抜け等の典型誤答も solver で算出し、誤答値と理由を提示。
- **五肢択一(MCQ)**: 一次向けに、よくある誤りを誤答選択肢として択一問題を組成。
- **対応科目**: 二次(電力・管理/機械・制御)に加え、一次・理論(交流回路/共振/過渡)。
- **問題セット**: 重複しない同型問題をバランスよく集めて模試/問題集を構築 (`denken set`)。
- **著作権**: 参考書 PDF は分野タクソノミー抽出のみ (本文は非保持)。生成は原理ベース。

### ディレクトリ

```
src/denken/   models / params / solver / figures / llm / generate / validate / render / cli / schedule
data/         fields.json (分野マスタ) + templates/*.yaml (問題雛形)
tests/        solver・検証・図・スケジューラのテスト
```

このリポジトリは引き続き開発中です。進捗を追いたい方は Watch / Star してください。

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
| M0.5 類題生成エンジン (Python, SymPy + 図 + Ollama) | 2026-05 | **done (alpha)** |
| M1 過去問 1 年分を Obsidian markdown 化 | 2026-06 | in progress |
| M2 Next.js skeleton + Supabase schema | 2026-07 | not started |
| M3 弱点診断 prototype | 2026-08 | not started |
| M4 公開ベータ (無料 trial) | 2026-Q4 | not started |

## ドキュメント

- [アーキテクチャ](docs/architecture.md) — パイプラインとモジュール責務
- [テンプレート作成ガイド](docs/templates.md) — YAML スキーマと記述方法
- [設計判断ログ](docs/ideas.md) — 調査記録と根拠
- [生成例](examples/) — 実際の出力サンプル
- [CHANGELOG](CHANGELOG.md)

## License

本エンジン(コード)は [MIT License](LICENSE)。
問題集データの配布ライセンスは別途検討(商用/非商用の切り分け、CC-BY-SA 等を想定)。

## Contact

- GitHub Issues / Discussions (このリポ)
- 関連リポ: [thinkyou0714](https://github.com/thinkyou0714)

## Why "DENKEN"

「電験」のローマ字。学習 OS は「電験合格までのアルゴリズム化」を目指す思想を持つため、試験名そのものをプロダクト名に採用。
