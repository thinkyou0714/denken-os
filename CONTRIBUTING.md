# コントリビューションガイド

DENKEN-OS は「電験合格を再現性のある学習プロセスに体系化する」プロジェクトです。
コード・問題データ・ドキュメントへの貢献を歓迎します。

## セットアップ

```bash
npm install            # postinstall で pre-push フックを自動有効化
npm run hooks:install  # 手動で有効化する場合（push 前に verify を自動実行）
npm test          # ユニットテスト
npm run lint      # Biome（lint + format チェック）
npm run typecheck # 型チェック
npm run validate:data  # data/ の問題を problem-schema.json で検証
npm run verify    # CI と同一の全品質ゲート（lint→型→型web→data→test→build）
```

> **pre-push フック**: push 時に `npm run verify` を自動実行し、1段でも失敗したら push を中止します
> （CI の `quality-gate` と同一。途中段の見落としによる赤を防ぐ恒久対策）。
> 緊急時のみ `git push --no-verify` でスキップ可。

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

## 監修フロー（公開前の人手チェック）

品質パイプライン（`docs/x-strategy/03-quality-pipeline.md`）の「重要論点は二重チェック」を運用に落とす。

- **監修が必須**になる問題は `lib/engine/gate.ts` の `requiresSupervision` で機械判定する:
  - 二種二次の記述（論述の正しさは人の判断が要る）
  - difficulty ≥ 4 の重要・難問（誤りが致命的）
  - 過去問引用（`past_exam_quoted`、原典確認）
- これらは検証4項目が揃っても、`validation.supervisor_checked=true` が無いと **`published`（対外配信）にできない**（`canPublish`）。
- 監修者（合格者/技術士）が手で解き直し・出典確認した上で `supervisor_checked` を立てる。
- `validated`（アプリ内の自己学習向け）と `published`（X発信・監修済みバッジ付き）を区別する。

## PR の前に

- [ ] `npm run verify` が緑（lint→typecheck→typecheck:web→validate:data→test:coverage→build:web を一括。CI と同一）
- [ ] 新規ロジックにテストを追加した（カバレッジ閾値: lib コアで line/func/stmt 80%・branch 75%）
- [ ] 問題データを足した場合、`source` と（改題なら）`citation` を明記した
- [ ] 監修必須の問題（二種二次記述・難問・過去問引用）は監修を経てから `published` にした
- [ ] 秘密情報・個人情報を含めていない

## ライセンス

コード = MIT、データ/ドキュメント = CC-BY-SA-4.0（[`LICENSES.md`](LICENSES.md)）。
コントリビュートした内容は同ライセンスで配布されることに同意したものとみなします。
