# DENKEN-OS

> 電験 (電気主任技術者試験) の合格を「再現性のある学習プロセス」として体系化するプロジェクト

## Status

**Pre-alpha — 構想中** (2026-05-19)

このリポジトリは現在スケルトン段階です。実装はまだ開始していません。
進捗を追いたい方は Watch / Star してください。

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

## License

License は M2 段階で確定予定。候補:
- アプリ部分 = MIT
- 問題集データ = CC-BY-SA or 独自ライセンス (商用利用と非商用利用の切り分けを検討中)

## Contact

- GitHub Issues / Discussions (このリポ)
- 関連リポ: [thinkyou0714](https://github.com/thinkyou0714)

## Why "DENKEN"

「電験」のローマ字。学習 OS は「電験合格までのアルゴリズム化」を目指す思想を持つため、試験名そのものをプロダクト名に採用。
