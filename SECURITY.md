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

## CI の依存インストール方針（#89: `npm ci --ignore-scripts` を採用しない）

サプライチェーン強化として `npm ci --ignore-scripts`（依存の postinstall を実行しない）を
検討したが、**本リポジトリでは採用しない**。理由は以下のとおり。

- ビルド依存の **esbuild が `postinstall`（`node install.js`）でプラットフォーム別バイナリを取得**する。
  `--ignore-scripts` を全体に適用するとこのバイナリ取得がスキップされ、
  `npm run build:web`（`scripts/build-web.ts` が esbuild でバンドル）が壊れる。
- すなわちハードニングのためにビルドが恒常的に失敗する状態を招くため、**安全側に倒して導入を見送る**。
- 代替の供給網対策は別途実施済み: 依存の SHA ピン（Renovate `pinGitHubActionDigests`）、
  `npm audit --omit=dev --audit-level=high`（CI ブロッキング）、dependency-review、gitleaks、
  Dependabot security updates（`.github/dependabot.yml`）、CodeQL（`.github/workflows/codeql.yml`）。
- 将来 esbuild 等のネイティブ依存を排せた場合や、ビルド専用ジョブでのみ scripts を許可する
  構成（インストールを分離）にできた場合は再検討する。

## SVG サニタイズ規約（II-199）

学習アプリの問題図（回路図・ベクトル図・ブロック図）はインライン SVG で配信している。
SVG は `<script>` 等を含むと XSS になるため、以下の規約を守ること。

- **`web/src/sanitize.ts` の `sanitizeSvg()` を必ず通す。** エンジンが生成した SVG 文字列は
  `lib/engine/figures/` で組み立てるが、Web 側で描画する前に必ず `sanitizeSvg()` を適用する。
- **`web/src/ui/dom.ts` の `SafeHtml` ブランド型を使う。** `h()` の `html` 属性は
  `SafeHtml` 型（branded string）のみを受け付ける。`safeHtml()` キャストは
  「呼び出し元がサニタイズ済みであることを明示する」契約であり、未サニタイズの文字列に
  使わないこと（`web/src/ui/safe-html.ts` 参照）。
- SVG 内の `<use href>` / `href=` / `xlink:href` 属性が外部URLを指す場合は除去される
  （SSRF/データ漏洩防止）。

## CSP / SRI 方針（II-199）

`web/index.html` に `Content-Security-Policy` meta タグを配置している。

```
default-src 'self';
script-src  'self' '<sha256-インラインスクリプトのハッシュ>';
style-src   'self' 'unsafe-inline';
img-src     'self' data:;
connect-src 'self' https://api.anthropic.com https://*.supabase.co https://*.supabase.in;
worker-src  'self'; manifest-src 'self';
```

- `unsafe-inline` はスタイルのみ許可（インライン CSS はデザイントークンの初期適用に必要）。
- インラインスクリプト（FOUC 防止の1行）は sha256 ハッシュで明示許可する。
  スクリプトを変更した場合は `docs/refactoring/round2/` の注記に従いハッシュを再計算すること。
- `dist/app.js` には `integrity="sha384-…"` の SRI 属性を付与している。
  `npm run build:web`（`scripts/build-web.ts`）が esbuild バンドル後に SHA-384 を算出して
  自動埋込するため、**手動での integrity 属性変更は禁止**。

## BYOK APIキー保管（II-199）

「質問タブ」の Claude ストリーミング機能は BYOK（Bring Your Own Key）方式を採用している。

- **APIキーは `localStorage` のみに保管する。** サーバには一切送信されない。
- **保管は利用者の自己責任。** プロダクトとして暗号化・難読化は行わない
  （sessionStorage への移行は UX 破壊のため見送り: `docs/refactoring/round2/ideas-round2.md` X-201 参照）。
- **バックアップ対象外。** 設定タブの「バックアップ書き出し」に APIキーは含まれない
  （`web/src/backup.ts` の `EXCLUDED_KEYS` で除外済み）。
- **キーをコミットしない。** `ANTHROPIC_API_KEY` を誤ってコミットした場合は、
  履歴の修正に加えキーのローテーション（失効）を必ず行うこと。
- `service_role` キーをクライアント側 JavaScript / Web バンドルに含めないこと。

## サポート対象バージョン

pre-alpha のため、セキュリティ修正は最新の `main` に対してのみ提供する。
