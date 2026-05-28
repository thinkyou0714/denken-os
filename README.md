# DENKEN-OS

> 電験 (電気主任技術者試験) の合格を「再現性のある学習プロセス」として体系化する学習 OS

## Status

**Alpha — 学習中核 + ゲーミフィケーション実装済** (2026-05-28)

外部サービス(Supabase / Stripe 等)なしで完結する学習中核とエンゲージメント機構を実装済み。
PWA としてインストールすればホーム画面から起動できる。

学習エンジン
- **FSRS-5** による間隔反復スケジューリングと弱点科目の自動診断
- 電験三種 4 科目(理論 / 電力 / 機械 / 法規)のサンプル問題 14 問(KaTeX 数式対応)
- インターリーブ(全科目混在)を既定とし、科目別の重点学習(blocked practice)も選べる
- 評価ボタンに次回出題間隔のプレビュー(Anki 風 UX)

エンゲージメント
- 連続学習日数(ストリーク) + 過去最高 + 月次フリーズ自動付与(罪悪感を煽らない設計)
- 受験予定日カウントダウンと「合格圏」到達率
- 今日のミッション(3 問)、XP / 級位 / 科目別レベル
- Memory Locked / Mastered / Interleaver の獲得バッジ
- 週次レポート(今週 vs 先週の活動日数)
- **最小 UI モード**でゲーミフィケーション要素を完全に隠せる(倫理設計)

データ
- ブラウザ単体で動作(進捗は localStorage)
- 進捗の JSON エクスポート / インポート(端末移行・バックアップ)
- 永続化は adapter 化(`StorageBackend`)してあり、将来 Supabase へ差し替え可能

PWA
- `manifest.webmanifest` + apple-icon + SVG アイコンでホーム画面追加に対応
- theme-color と standalone display で「アプリ」として起動可能

## Why this design

- **FSRS-5 (`ts-fsrs`)**: SM-2(Anki 旧来)比で同じ定着率を得るのに復習回数が 20〜30% 少なく、
  個人の忘却曲線に最適化される現行のベストプラクティス
- **インターリーブを既定に**: 移行テストで blocked +43% 等、長期保持に有利という学習科学の結果
- **ストリーク・フリーズと最小 UI モード**: 2020 JPSP の知見(1 日途切れで 63% が習慣放棄)と、
  Duolingo の逆説(維持を易しくする方が長期 LTV が上がる)を踏まえた**罪悪感を煽らない**設計
- **学習中核ファースト**: Supabase / Stripe / n8n は adapter 越しに後付け可能。
  まずは外部サービスなしで成立する学習価値を確立する方針

## Getting started

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm lint       # ESLint (eslint-config-next flat config)
pnpm typecheck  # tsc --noEmit
pnpm test       # ドメイン + コンポーネント結合テスト (Vitest, 59 件)
pnpm build      # 本番ビルド
```

学習画面はキーボード操作にも対応(数字キーで選択肢 / 正解後の評価)。
`lint` / `typecheck` / `test` / `build` は push・PR ごとに GitHub Actions
(`.github/workflows/ci.yml`) で実行される。Claude Code on the web で開いた際は
SessionStart フック(`.claude/settings.json`)が依存を自動インストールする。

## Architecture

学習ロジックはフレームワーク非依存の `src/domain/` に集約し、UI / 永続化と分離している。

```
src/
  domain/
    content/schema.ts            Zod による問題スキーマ + 型ガード
    srs/scheduler.ts             ts-fsrs (FSRS-5) ラッパ + 次回間隔プレビュー
    srs/diagnosis.ts             弱点診断 + 復習キュー生成
    progress/store.ts            進捗ストア (snapshot/restore 対応)
    storage/backend.ts           永続化 adapter (memory / localStorage / 将来 Supabase)
    gamification/
      streak.ts                  連続日数 + 過去最高 + フリーズ自動消費 + grace day
      xp.ts                      XP / Lv / 級位 / 合格圏%(平方則レベリング)
      achievements.ts            Memory Locked / Mastered / Interleaver
    settings/store.ts            受験日 / 最小UI / 月次フリーズ自動付与
  data/problems/                 科目別シード問題 (起動時に Zod 検証)
  app/                           Next.js App Router (薄いページ層)
    page.tsx                     ダッシュボード
    study/page.tsx               学習セッション (科目フィルタ対応)
    problems/page.tsx            問題一覧 (静的)
    settings/page.tsx            受験日 / 最小UI 設定
    manifest.ts                  PWA マニフェスト
    apple-icon.tsx               iOS ホーム画面アイコン (ImageResponse 動的生成)
  components/                    StudySession / StreakChip / MarkdownMath
  lib/                           useProgress / useSettings (クライアントフック)
public/icon.svg                  PWA アイコン (SVG, maskable 対応)
tests/                           Vitest (ドメイン + コンポーネント結合、計 59 件)
```

学習ループ(`StudySession`)は Next.js のページから切り離し、`queue` と `onGrade`(と
任意の `getCard`)を props で受け取る純粋なコンポーネント。これにより routing / localStorage
非依存で結合テストできる。誤答は FSRS の lapse として常に "again" で記録する(教育学的整合)。

## Vision

電験三種・二種を独学で合格するための学習 OS。一度合格した知見を、次の受験者が再利用できる形で体系化することを目指します。

- 過去問データベース + 解説 markdown
- 弱点分野の自動診断 + 問題自動生成 (Claude API)
- 学習進捗の可視化 (Supabase で記録、Next.js でダッシュボード)
- Obsidian vault 形式でも配布
- n8n で過去問・解説の取り込み自動化

## Predicted stack

- **Frontend**: Next.js 16 (App Router) + Tailwind v4 (実装済)
- **SRS engine**: ts-fsrs (FSRS-5) (実装済)
- **Backend**: Supabase (Auth + Postgres + Storage) [M2]
- **Payment**: Stripe [M4]
- **AI**: Claude API (問題生成・解説) [M3]
- **Source format**: Markdown + KaTeX (実装済)
- **Automation**: n8n (問題集 import / リマインダー) [M3+]

## Roadmap

| Milestone | Target | Status |
|---|---|---|
| M0 README + vision | 2026-05 | done |
| M1 学習中核 (FSRS + スキーマ + サンプル + 3 画面) | 2026-06 | **done** |
| M1.5 ゲーミフィケーション + PWA + 設定 | 2026-06 | **done** |
| M2 Supabase schema + 認証で進捗をクラウド同期 | 2026-07 | not started |
| M3 Claude API による問題自動生成 / 解説強化 | 2026-08 | not started |
| M4 公開ベータ + Stripe | 2026-Q4 | not started |

## License

License は M2 段階で確定予定。候補:
- アプリ部分 = MIT
- 問題集データ = CC-BY-SA or 独自ライセンス

## Contact

- GitHub Issues / Discussions (このリポ)
- 関連リポ: [thinkyou0714](https://github.com/thinkyou0714)

## Why "DENKEN"

「電験」のローマ字。学習 OS は「電験合格までのアルゴリズム化」を目指す思想を持つため、試験名そのものをプロダクト名に採用。
