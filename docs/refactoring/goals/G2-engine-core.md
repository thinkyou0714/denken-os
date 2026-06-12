# G2: エンジンコアの頑健化と入口整備

対応アイデア: I-005, I-006, I-013〜I-020（[ideas-100.md](../ideas-100.md)）
Wave: 1（G1/G3/G4/G5 と並列実行）

## 目的（根本原因R3/R4）

generate/validate/narrate/figures/xpost/cli に散在する重複定数・暗黙の環境依存・
文脈のないエラーを整理し、エンジンの単一入口（barrel）を整備する。

## 所有ファイル（これ以外は編集禁止）

- `lib/engine/generate.ts`, `lib/engine/validate.ts`, `lib/engine/gate.ts`, `lib/engine/narrate.ts`,
  `lib/engine/schema.ts`, `lib/engine/cli.ts`
- `lib/engine/figures/**`, `lib/engine/xpost/**`
- 新規: `lib/engine/index.ts`
- 新規テストの**追加のみ**: `tests/engine/narration-match.test.ts`（既存テストの変更は禁止）

## 他タスクとの契約

- `lib/engine/clean.ts` と `lib/engine/templates/**` は G1 の所有。**編集禁止**。
  G1 が `clean.ts` に `ANSWER_EPSILON` を export する契約なので、validate.ts はそれを import してよい
  （wave 終了時にオーケストレータが統合検証する。G1 完了前に型エラーになる場合は import を書いた上で待つのではなく、
  `import { ANSWER_EPSILON } from "./clean.js"` を記述して自分のスコープの tsc は対象外とせず、
  vitest 実行は tests/engine の関連分のみで確認する）。
- 既存 export のシグネチャは不変（追加のみ可）。既存テストを変更せずグリーンであること。

## 実装項目

1. **validate.ts の ε 一元化**（I-006）: ハードコード `1e-6` を `ANSWER_EPSILON`（clean.ts 由来）に置換。
2. **`narrationMatchesAnswer` の頑健化**（I-013）:
   - 数値抽出regexを指数表記（`1.5e3` 等）対応に拡張。
   - 既存の受理/拒否挙動を変えないこと（既存テスト無変更グリーン＋ `npm run build:problems` で生成物不変が証明）。
   - 新規テスト `tests/engine/narration-match.test.ts` で指数表記・記号付き数値・最終行一致のケースを追加。
3. **confidence 定数化**（I-014）: `generate.ts` の `0.9` を `const DEFAULT_CONFIDENCE = 0.9` として
   ファイル冒頭へ。コメントで「solver_checked な純関数算出だが human_checked 前のため 1.0 にしない」根拠と
   `minConfidence` との関係を明記。
4. **ナレーター制御の明示化**（I-015〜I-017）:
   - `DENKEN_NARRATOR_MODE=auto|stub|api`（既定 auto=現行挙動）を `defaultNarrator()` に実装。
     `api` 指定で API キー欠落なら明確なエラーを投げる。
   - モデル名既定値を `const DEFAULT_NARRATE_MODEL = "claude-haiku-4-5"` に抽出。
   - `CorruptingNarrator` の実使用箇所を grep で確認し、JSDoc に「validate の整合確認の負例テスト用」と使用箇所を明記
     （未使用なら `@internal` を付けて残す。削除はしない）。
5. **barrel 新設**（I-018）: `lib/engine/index.ts` で generate/generateOne/validateProblem/narrationMatchesAnswer/
   defaultNarrator/templates レジストリ/schema 型を re-export。既存の深い import は壊さない（変更しない）。
6. **figures の fmt コメント**（I-019）: SVG 内表記専用であることと clean.ts 系との使い分けを JSDoc 化。
7. **cli/xpost のエラー文脈**（I-020）: 失敗時に topic・段階（draw/narrate/validate）を含むメッセージへ。
   `process.exit` の exit code は現行を維持。

## 受け入れ基準

- `npx vitest run tests/engine` 全グリーン（既存テスト無変更）。
- `npm run build:problems` 後に `git diff --exit-code web/problems.json` 差分ゼロ（確認後、変更を残さない）。
- `DENKEN_NARRATOR_MODE=stub` で `npm run gen -- --count 1` 相当の CLI が動作（README の使い方に従う）。
- `npx biome check lib/engine --files-ignore-unknown=true`（templates/clean.ts を除く自所有分）エラーなし。
- `npx tsc --noEmit` エラーなし（G1 と同時進行のため、wave終盤で再確認）。
