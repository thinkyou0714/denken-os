# G8: ドキュメント整合（README / CONTRIBUTING / architecture / ADR / CHANGELOG）

対応アイデア: I-099, I-100, I-092の代替策（[ideas-100.md](../ideas-100.md)）
Wave: 3（G9 と並列。コード変更がすべて完了した状態から開始）

## 目的

リファクタ後の実態（web/src の ui/views/state 分割、lib/shared、テンプレヘルパー層、新スクリプトフラグ、
新ワークフロー）にドキュメントを一致させ、二重スキーマの設計判断を ADR として残す。

## 所有ファイル（これ以外は編集禁止）

- `README.md`, `CONTRIBUTING.md`, `CHANGELOG.md`
- `docs/architecture.md`, 新規 `docs/adr/0001-dual-schema-validation.md`
- `docs/refactoring/plan.md`（ステータス追記のみ）, `docs/refactoring/ideas-100.md`（実装結果の注記のみ）
- コード（lib/web/scripts/tests/設定）は一切編集禁止。**必ず現物のコードを読んで**現状を記述すること
  （ゴールファイルの設計表ではなく、実際に git の状態にあるツリーが正）。

## 実装項目

1. **README.md**: 
   - `npm run verify` が「CI と同一のプリプッシュ確認（lint+型+データ検証+テスト+ビルド）」である説明を scripts 表へ。
   - 新フラグ（`build:problems --per-topic`、各 `--help`）と環境変数（`DENKEN_NARRATOR_MODE`）を反映。
   - web/src の新構成（ui/views/state）を簡潔に記載。Node 要件（.nvmrc=22, engines>=20, engine-strict）の注記。
2. **CONTRIBUTING.md**: dev セットアップに `npm run build:web`（web/src 編集後に必要）と
   プッシュ前 `npm run verify` を明記（husky を入れない方針の代替, I-092）。
3. **docs/architecture.md**: lib/shared・engine/templates/helpers・web/src 分割後のモジュール図/説明を現状に一致させる。
4. **ADR 新設**（I-099）: `docs/adr/0001-dual-schema-validation.md` — problem-schema.json（draft-07/ajv, CI・外部公開用）と
   lib/engine/schema.ts（zod, 実行時・型推論用）を併存させる判断・トレードオフ・ドリフト検知テスト（tests/engine/schema-drift.test.ts）への参照。
5. **CHANGELOG.md**: 本リファクタのエントリ（Keep a Changelog 形式が既存なら踏襲。
   「変更なし: 生成問題データ・保存データ形式・UI挙動」を明記）。
6. **docs/refactoring/plan.md**: 各タスクの完了状態を追記。ideas-100.md に実装からこぼれた項目があれば
   「見送り」へ移して理由を記す（コードは触らず記録のみ）。

## 受け入れ基準

- README の scripts 表と package.json の scripts が一致（grep で突合）。
- architecture.md に存在しないパス・モジュール名が登場しない（記載パスを ls で確認）。
- ADR が Context/Decision/Consequences 構成。
- リンク切れがない（相対リンク先の存在確認）。
