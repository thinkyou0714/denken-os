# 実装指示 09: CI品質ゲート（schema検証）

> ステータス: 実装済み（コア）。 実装: `.github/workflows/validate.yml ＋ scripts/validate-problems.ts`。**PR #1 でCIが無かった穴を埋める**最優先の安全網。

## 0. ゴール
全ての問題JSONを `problem-schema.json` に対して**PR時に自動検証**し、
schema違反・出典欠落・検証未通過の公開を CI で機械的に止める。

## 1. 核心の設計判断 ★（根本原因＝CIの欠如）
- 現状 PR にチェックが無く、品質が人手依存。**ajv + GitHub Actions** で自動化が定石。
- schema で表現できない不変条件（**answer ∈ choices**）は**カスタム検証スクリプト**で補う
  （`03-quality-pipeline.md` のチェックをコード化）。

## 2. スタック
- GitHub Actions ＋ `ajv-cli`（または `lib/engine/validate.ts` を CI から実行）。
- 既存の `vitest`（エンジンのテスト）も CI で実行。

## 3. 機能要件
- PR/push で発火するワークフロー（`.github/workflows/validate.yml`）
- 変更された問題JSON を schema 検証（ajv, draft-07）
- カスタム検証: multiple_choice の answer∈choices / status=published は検証4項目true
- 出典: source.type≠original は citation 必須（schema 済だが CI で再確認）
- エンジンのユニットテスト実行
- 失敗時は PR にチェック赤＋どのファイル/規則で落ちたか表示

## 4. 受け入れ条件
- [ ] schema 違反のJSONを含むPRが CI で落ちる
- [ ] answer∉choices のサンプルが落ちる（カスタムチェック）
- [ ] 正常データのPRは緑
- [ ] エンジンのテストが CI で走る

## 5. やらないこと
- 文章（解説）の正しさの自動判定（人手＋エンジンの数値整合に委ねる）
- main への直 push 強制等の運用ルール変更（別途相談）
