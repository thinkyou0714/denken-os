# コントリビューションガイド

DENKEN-OS は「電験合格を再現性のある学習プロセスに体系化する」プロジェクトです。
コード・問題データ・ドキュメントへの貢献を歓迎します。

## セットアップ

```bash
npm install
npm test          # ユニットテスト
npm run lint      # Biome（lint + format チェック）
npm run typecheck # 型チェック
npm run validate:data  # data/ の問題を problem-schema.json で検証
```

## 開発の約束（絶対原則）

`docs/x-strategy/README.md` の「絶対原則」をコードでも守ります。

1. **間違った問題・著作権違反を絶対に出さない。** 1問の事故が全てを壊す。
   - 問題の正解は **コードで決定論的に算出**する（LLM に出させない）。`lib/engine/`。
   - 全問が `problem-schema.json`（zod / ajv の両方）と投稿前チェックを通ること。
   - 過去問由来は `source.type` と `citation` を必須にする（`lib/ingest/`）。
2. **秘密情報をコミットしない。** API キー等は `.env`（`.env.example` を参照）。
3. **moat と安全は自動化しない。** 会話・コミュニティの温度・品質の最終承認・訂正の承認は人間。

## 問題テンプレートを追加する

1. `lib/engine/templates/<topic>.ts` に純関数テンプレートを実装（`Template` インターフェース）。
   - 正解・誤答はコードで算出し、`isCleanAnswer` で「綺麗な値」だけ採用。
2. `lib/engine/templates/index.ts` のレジストリに登録。
3. `tests/engine/templates.test.ts` 系に、既知 params の再現テストと「N問生成→全件 validate 通過」を追加。

## PR の前に

- [ ] `npm run lint` `npm run typecheck` `npm test` `npm run validate:data` が緑
- [ ] 新規ロジックにテストを追加した
- [ ] 問題データを足した場合、`source` と（改題なら）`citation` を明記した
- [ ] 秘密情報・個人情報を含めていない

## ライセンス

コード = MIT、データ/ドキュメント = CC-BY-SA-4.0（[`LICENSES.md`](LICENSES.md)）。
コントリビュートした内容は同ライセンスで配布されることに同意したものとみなします。
