# 品質ハードニング計画（根本原因と実装済み対策）

この文書は、リポジトリ全体評価で見えた減点要因を「症状」ではなく「根本原因」から潰すための改善計画。
2026-06-01 時点では、まず **CI品質ゲートをローカルで再現可能にすること** を最優先P0とする。

## スコアを下げていた根本原因

| 優先度 | 問題 | 根本原因 | 実装済み対策 | 次の推奨 |
|---|---|---|---|---|
| P0 | `npm run typecheck` が Node 型不足で落ちる | `tsconfig.json` が Node 型を要求する一方、制限付きレジストリでは `@types/node` を取得できない | Node CLI/テストで使う最小APIだけを `types/node-lite.d.ts` に固定し、型ゲートを外部レジストリ可用性から切り離す | 通常のnpm環境では `@types/node` へ置換する判断を定期レビュー |
| P0 | Zod v4で `z.record` の型が落ちる | Zod v3系の単引数記法が残り、v4系のkey/value指定に追随していない | `z.record(z.string(), paramField)` に変更し、schemaドリフト検知テストの対象に残す | 依存更新時は `npm run verify` を必須化 |
| P0 | Biomeがテンプレート文字列化を指摘 | 文字列連結が残り、lint結果にノイズが出ていた | テンプレートリテラルへ統一 | `npm run format` 後に差分ゼロを確認 |
| P1 | READMEの件数・ロードマップが古い | 実装の進捗にドキュメント更新が追随していない | READMEに「今できること / 未接続」を明記し、`npm run audit:status` で棚卸しできるようにした | リリースごとにREADMEのStatus表を更新 |
| P1 | validated問題が3件のみ | 生成エンジンMVPと学習プロダクト成立に必要な問題量の差が大きい | 現状を明示し、`audit:status` と問題データレビューIssueテンプレートを追加 | 科目×形式ごとに最低10件ずつ増やす |
| P2 | 実運用が重い | 学習・作問・検算・SNS・開発を1人に寄せすぎている | 週次バッチ、下書き運用、承認ゲートを明文化済み | 投稿頻度はKPIで増減し、監修者確保までは「検証中」表現を徹底 |

## 品質ゲートのベストプラクティス

1. **ローカルとCIを同じコマンドに寄せる**
   - 入口は `npm run verify` に集約し、lint/typecheck/schema検証/test/buildを同じ順序で実行する。
   - 個別確認は `npm run lint`、`npm run typecheck`、`npm run typecheck:web`、`npm run validate:data`、`npm run audit:status`、`npm test`、`npm run build:web`。
   - データ量・形式・監修状況の棚卸しは `npm run audit:status` で確認し、公開前判定では `npm run release:check`（= `verify` + strict audit）を使う。

2. **型ゲートは「外部依存の取得成功」と分離する**
   - `@types/node` を取れる通常環境ではそれが最善。
   - ただし、制限付きレジストリやCIキャッシュ障害で型定義だけが落ちると、プロダクト品質ではなく環境可用性で失敗する。
   - このリポジトリでは、実際に使っている Node API が小さいため、暫定的に `types/node-lite.d.ts` で最小面を固定する。

3. **スキーマは二重定義のドリフトをテストで検知する**
   - JSON Schemaは公開データ検証、Zodは実行時/型推論に使う。
   - 片方だけ更新されるリスクを `tests/engine/schema-consistency.test.ts` で代表ケース検出する。

4. **AI生成問題は「生成」より「棄却」を重視する**
   - 正解はLLMに出させない。
   - 解説の最終数値がコード算出答えと一致しない場合は破棄する。
   - `validated` / `published` へ進める条件は human check を必須にする。

5. **validatedデータは少数精鋭から増やす**
   - 初期は数を急がず、各テンプレートで「代表値・境界値・典型誤答」を作る。
   - 目安: まず validated 50件、次に100件。
   - 各追加PRは `source`、`validation`、`common_wrong_choice`、解説の単位整合を確認する。

## 次の実装バックログ

| 優先度 | バックログ | 完了条件 |
|---|---|---|
| P0 | `npm run verify` を常時グリーンに保つ | ローカル/CIで全ゲート成功 |
| P1 | 問題データレビューIssueテンプレを運用する | 新規問題に検算・出典・監修チェック欄がある |
| P1 | data coverage監査を定期実行する | `npm run audit:status` で科目・形式・status件数と推奨が見え、公開前は `npm run release:check` が不足を失敗扱いにする |
| P1 | README Statusの自動更新補助 | テスト件数やvalidated件数をスクリプト結果から反映できる |
| P2 | 監修フローをIssueテンプレ化 | supervisor_checkedへ進むレビュー手順が明文化される |
| P2 | Webアプリのデータ更新導線 | validated問題のみを `web/problems.json` に同期できる |
