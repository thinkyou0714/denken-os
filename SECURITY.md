# セキュリティポリシー

## 脆弱性の報告

セキュリティ上の問題を見つけた場合は、**公開 Issue を作らず**に
GitHub の [Private vulnerability reporting](https://github.com/thinkyou0714/denken-os/security/advisories/new)
から非公開で報告してください。

- 初回応答の目安: 7日以内
- 内容を確認のうえ、修正と公表の段取りを相談します。

## 対象範囲

| 範囲 | 例 |
|---|---|
| 対象 | `lib/` `scripts/` `web/` のロジック、CI設定、Supabase RLS（`supabase/migrations/`） |
| 対象外 | `docs/` の戦略記述、未監修のデモ問題（`web/problems.json`）、第三者依存自体の脆弱性（[Dependabot](.github/dependabot.yml) で別途追跡） |

## 機密情報の取扱い

このリポジトリは秘密情報をコミットしない設計になっている。

- **APIキー・トークンは環境変数で渡す。** `ANTHROPIC_API_KEY` 等は
  [`.env.example`](.env.example) を雛形に各自の `.env`（`.gitignore` 済み）へ置く。
  キーが無い場合でも決定論スタブで動作するため、生成・検証は鍵なしで再現できる。
- **Supabase は Row Level Security 前提。** スキーマは RLS 付きで
  `supabase/migrations/` に DDL を用意している。`service_role` キーをクライアント／
  Web バンドルに含めないこと。
- **X 実投稿は既定で無効。** 外部送信は `lib/clients/x-client.ts` の境界に隔離され、
  既定は下書きエクスポート（`DraftExportClient`）。実投稿アダプタの資格情報は
  サーバ側環境変数でのみ扱う。
- 万一キーをコミットした場合は、**履歴の修正だけでなく当該キーのローテーション（失効）**を行うこと。

## サポート対象バージョン

pre-alpha のため、セキュリティ修正は最新の `main` に対してのみ提供する。
