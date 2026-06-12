# G5: スクリプト共通化・CI/CD 強化・設定整備

対応アイデア: I-033, I-075〜I-088, I-090, I-091, I-095〜I-098（[ideas-100.md](../ideas-100.md)）
Wave: 1（G1〜G4 と並列実行）

## 目的（根本原因R5）

スクリプトの重複と脆い書き込み、CI の意図とコードの不一致、設定の緩みを正す。

## 所有ファイル（これ以外は編集禁止）

- `scripts/**`（**build-web.ts を除く** — G4 所有）
- `.github/workflows/**`, `renovate.json`, `.gitattributes`, `.npmrc`（新規）, `.env.example`
- `package.json`（Wave 1 で編集できるのは G5 のみ）
- `supabase/migrations/`（新規 0002 のみ。0001 は変更禁止）
- 新規: `scripts/shared.ts`（または scripts/ 内の共有モジュール）
- 既存テストの変更は禁止。スクリプトから純関数を抽出した場合のテスト追加は G7 が行う（自分では tests/ を触らない）。

## 他タスクとの契約

- `lib/shared/rng.ts`（G3 が新設、xorshift を同一出力で提供）を `scripts/build-problems.ts` から import し、
  ローカル実装を削除する。**生成される web/problems.json が不変であることを必ず確認**。
- `lib/**` は G1〜G3 所有、`web/**`・`scripts/build-web.ts` は G4 所有。編集禁止。
- `.env.example` に G2 が実装する `DENKEN_NARRATOR_MODE`（auto|stub|api、既定 auto）の説明を追記。
- `package.json` の既存 scripts のコマンド内容は変更しない（追加は可）。dependencies の追加・更新は行わない。

## 実装項目

### スクリプト（I-075〜I-082, I-033）

1. `scripts/shared.ts` 新設: `atomicWriteFileSync(path, data)`（tmp+rename, I-077）、
   `printHelp(usage)` 的な共通処理、`validateOrExit(problems, context)`（I-079）。
2. `build-problems.ts`: RNG を lib/shared/rng.ts に置換（I-033）。`--per-topic <n>` フラグ（既定10不変, I-076）。
   `--help`。書き込みを atomicWriteFileSync に。
3. `seed-data-problems.ts`: `--help`（有効 topic 一覧表示, I-075）。未知 topic エラーに候補一覧。原子的書き込み。
4. `audit-status.ts`: `--help`（--strict/--json の説明, I-075）。
5. `validate-problems.ts`: AJV `strict: false` を `strict: true` で試し、通らない場合は理由コメントを付けて現状維持（I-078）。
   エラーメッセージにファイルパスを必ず含める（I-081）。
6. `export-vault.ts`: 書き込み try/catch で権限/容量の文脈付きエラー（I-080）。
7. main と純関数の分離（I-082）: 各スクリプトで「引数パース→処理→出力」の処理部を export された関数に
   切り出す（テスト追加は G7。ここでは構造のみ）。

### CI/CD（I-083〜I-088, I-090, I-091）

8. `validate.yml`:
   - `on.push.branches: [main]` に限定（PR との二重実行解消, I-091）。concurrency コメントを実挙動に合わせ修正（I-085）。
   - coverage（coverage/ ディレクトリ）と web/dist を `actions/upload-artifact@v4` で保存（I-083, retention-days: 7）。
   - vitest の結果要約を `GITHUB_STEP_SUMMARY` に出力（I-090。`npm run test:coverage 2>&1 | tail -20 >> "$GITHUB_STEP_SUMMARY"` 程度の簡易で可）。
9. `deploy-pages.yml`: `cancel-in-progress: false` に変更しコメントの意図（直列・中断なし）と一致させる（I-084）。
10. `renovate.json`: `helpers:pinGitHubActionDigests` を extends に追加（I-086）。
11. `release.yml` 新設（I-087）: `on: push.tags: ["v*"]` + `workflow_dispatch`。`npm ci` → `npm run release:check` →
    `softprops/action-gh-release` は使わず `gh` も使わず、`actions/github-script@v8` か `gh release create --draft --generate-notes`
    の利用可否を考慮し、最小構成（permissions: contents: write、timeout、concurrency 付き）で Release 草稿を作成。
12. `dependency-review.yml` / `secrets-scan.yml`: permissions / timeout-minutes / persist-credentials: false の漏れを点検・追補（I-088）。

### 設定・データ（I-095〜I-098）

13. `.npmrc` 新設: `engine-strict=true`（I-095）。
14. `.env.example`: `DENKEN_NARRATE_MODEL` の既定値をコメントで明記、`DENKEN_NARRATOR_MODE` を追記（I-096）。
15. `.gitattributes`: `data/problems/T-0001.json`〜`T-0003.json` を手書き（linguist-generated 解除）として区別（I-097）。
16. `supabase/migrations/0002_indexes.sql` 新設（I-098）: `answer_logs(problem_id)` インデックス、
    既存 0001 を読み他に明白な不足（外部キー検索パス）があれば追補。RLS/テーブル定義の変更はしない。

## 受け入れ基準

- `npm run validate:data` / `npm run build:problems`（→ `git diff --exit-code web/problems.json` 差分ゼロ、確認後変更を残さない）
  / `npm run audit:status` がすべて成功。
- 各スクリプトの `--help` が usage を表示して exit 0。
- `npx biome check scripts` エラーなし（build-web.ts は対象外）。
- workflow YAML は `python3 -c "import yaml,sys;yaml.safe_load(open(sys.argv[1]))" <file>` 等で構文確認。
- `npx tsc --noEmit` エラーなし。
