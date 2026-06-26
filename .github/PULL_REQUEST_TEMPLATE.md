## 概要

<!-- 何を・なぜ変えたか -->

## 種別

- [ ] 機能追加 / [ ] バグ修正 / [ ] ドキュメント / [ ] リファクタ / [ ] 問題データ

## チェックリスト（CONTRIBUTING.md）

- [ ] `npm run lint` `npm run typecheck` `npm test` `npm run validate:data` が緑
- [ ] 新規ロジックにテストを追加した
- [ ] 問題データを追加/変更した場合、`source`・（改題なら）`citation` を明記した
- [ ] 正解はコードで決定論的に算出している（LLM に出させていない）
- [ ] 秘密情報・個人情報を含めていない（`.env` はコミットしない）

## CI（必須 / 任意）

- **必須（マージをブロック）**: `validate`（lint・型・テスト・データ検証・ビルド）, `secrets-scan`, `dependency-review`, `codeql`
- **任意（情報目的・非ブロッキング）**: `e2e`（Playwright スモーク） — 失敗してもマージ可否には影響しません

## 関連

<!-- Issue / spec (docs/automation/NN) など -->
