# DENKEN-OS

> 電験 (電気主任技術者試験) の合格を「再現性のある学習プロセス」として体系化するプロジェクト

## Status

**Alpha — ローカルファースト中核を実装** (2026-05-28)

外部サービス(Supabase / Stripe 等)なしで完結する学習中核を実装済みです。

- FSRS-5 による間隔反復スケジューリングと弱点科目の自動診断
- 電験三種 4 科目(理論 / 電力 / 機械 / 法規)のサンプル問題 10 問(KaTeX 数式対応)
- ブラウザ単体で動作(進捗は localStorage に保存)。学習・ダッシュボード・問題一覧の 3 画面
- 永続化は adapter 化(`StorageBackend`)してあり、将来 Supabase へ差し替え可能

## Getting started

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm lint       # ESLint (eslint-config-next flat config)
pnpm typecheck  # tsc --noEmit
pnpm test       # ドメイン + コンポーネント結合テスト (Vitest)
pnpm build      # 本番ビルド
```

学習画面はキーボードでも操作できる(数字キーで選択肢、回答後は数字キーで定着度の選択)。

`lint` / `typecheck` / `test` / `build` は push・PR ごとに GitHub Actions (`.github/workflows/ci.yml`) で実行される。
Claude Code on the web で開いた際は SessionStart フック(`.claude/settings.json`)が依存を自動インストールする。

## Architecture

学習ロジックはフレームワーク非依存の `src/domain/` に集約し、UI / 永続化と分離している。

```
src/
  domain/
    content/schema.ts     Zod による問題スキーマ
    srs/scheduler.ts      ts-fsrs (FSRS-5) ラッパ
    srs/diagnosis.ts      弱点診断 + 復習キュー生成
    progress/store.ts     進捗ストア(StorageBackend 非依存)
    storage/backend.ts    永続化 adapter (memory / localStorage / 将来 Supabase)
  data/problems/          科目別シード問題 (起動時に Zod 検証)
  app/                    Next.js App Router (/, /study, /problems) — 薄いページ層
  components/             StudySession (学習ループ) / MarkdownMath (Markdown + KaTeX)
  lib/useProgress.ts      クライアント側の進捗フック
tests/                    Vitest (ドメイン + コンポーネント結合テスト)
```

学習ループ(`StudySession`)は Next.js のページから切り離し、`queue` と `onGrade` を
props で受け取る純粋なコンポーネントにしてある。これにより routing/localStorage に依存せず
結合テストで操作フローを検証できる。誤答時は FSRS の lapse として常に「もう一度」で記録する。

なぜ FSRS か: SM-2(Anki 旧来方式)比で同じ定着率を得るのに復習回数が 20〜30% 少なく、
学習データが増えるほど個人の忘却曲線に最適化できる現行のベストプラクティスのため。

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
| M1 学習中核 (FSRS + スキーマ + サンプル問題 + 3 画面) | 2026-06 | **done (local-first)** |
| M2 Supabase schema + 認証で進捗をクラウド同期 | 2026-07 | not started |
| M3 弱点診断の高度化 + Claude API による問題自動生成 | 2026-08 | prototype (診断は実装済) |
| M4 公開ベータ (無料 trial) + Stripe | 2026-Q4 | not started |

## License

License は M2 段階で確定予定。候補:
- アプリ部分 = MIT
- 問題集データ = CC-BY-SA or 独自ライセンス (商用利用と非商用利用の切り分けを検討中)

## Contact

- GitHub Issues / Discussions (このリポ)
- 関連リポ: [thinkyou0714](https://github.com/thinkyou0714)

## Why "DENKEN"

「電験」のローマ字。学習 OS は「電験合格までのアルゴリズム化」を目指す思想を持つため、試験名そのものをプロダクト名に採用。
