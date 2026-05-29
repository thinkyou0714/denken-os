# 調査: DENKEN-OS に最適なツール活用 100 案

> 目的: 電験学習OS（問題生成＆検証エンジン＋オフライン音声学習PWA＋X発信）に対し、
> 「どのツールを使うのが最適か」を 100 案で深掘りする。各案に用途・採否理由・推奨度を付す。
>
> 制約前提（採否の判断軸）: ① オフラインファースト/PWA ② 無料〜低コスト（個人開発）
> ③ ハルシネーション対策（正解はコード算出） ④ 日本語特化 ⑤ 現行スタック（TypeScript/Node・
> zod・vitest・biome・esbuild・Anthropic SDK・Supabase予定）との整合 ⑥ 著作権/コンプラ。
>
> 推奨度: ◎=採用推奨（現行/直近） / ○=有力候補 / △=将来・限定的 / ✕=非推奨（理由明記）

---

## A. 問題生成・検証エンジン（数値の正しさが命）

1. ◎ **Anthropic Claude API**（解説の言い回し生成）— 数値はコード算出、文章のみLLM。現行 `narrate.ts`。Haikuで安価。
2. ◎ **zod**（実行時スキーマ検証）— 問題スキーマのミラー。現行採用。型と検証を一元化。
3. ◎ **ajv (JSON Schema draft-07)**（CI データ検証）— `problem-schema.json` の正準。zodとドリフト検知。現行。
4. ○ **mathjs**（数式評価・単位換算）— テンプレ拡張時の検算補助。単位付き計算で物理妥当性チェック強化。
5. ○ **decimal.js / big.js**（厳密小数）— 「綺麗な値」判定や丸め誤差の根絶。clean-answer の堅牢化。
6. △ **SymPy（Pythonマイクロサービス）**（記号計算）— 二次記述の厳密検算。別言語/別プロセスのため将来。
7. △ **Wolfram Alpha API**（クロスチェック）— 検算の第三者照合。商用/コストのため限定。
8. ○ **Ollama（ローカルLLM）**（オフライン解説生成）— APIコスト/秘匿。`Narrator` I/F に差し替え可能（設計済）。
9. ○ **OpenAI/Gemini SDK**（モデル冗長化）— `Narrator` 抽象の別実装。可用性ヘッジ。数値はコード側で不変。
10. ✕ **LLMに正解を出させる構成** — ハルシネーション必発。設計原則に反するため永久に不採用。

## B. 音声・TTS・音声学習（法規聞き流し）

11. ◎ **Web Speech API (SpeechSynthesis)**（ブラウザTTS）— 無料・オフライン・現行採用。`browser-speaker.ts`。
12. ○ **VOICEVOX（ローカル音声合成）**（高品質日本語）— 無料・自然な日本語。事前生成 or ローカルサーバ。
13. △ **Google/Azure/Amazon Polly Neural TTS**（クラウド高品質）— 自然だがコスト/オンライン依存。配信用音源に限定。
14. △ **ElevenLabs**（最高品質・感情）— コスト高。プレミアム音源やポッドキャスト配布用に限定検討。
15. ○ **SSML**（韻律制御）— クラウドTTS導入時に間/強調を精密化（Web Speech は非対応）。
16. ◎ **MediaSession API**（ロック画面操作）— 現行採用。ながら学習のUX中核。
17. ○ **Web Speech API (SpeechRecognition)**（音声で自己採点）— 「正解と言って」入力。オフライン制約あり△寄り。
18. ○ **ffmpeg**（音源結合・無音挿入・mp3化）— 事前生成音源やポッドキャスト書き出しのバッチ処理。
19. △ **kuromoji.js / MeCab**（形態素解析→読み付与）— 専門用語の読み辞書を自動拡充（現行は手辞書 `READINGS`）。
20. △ **Howler.js**（音声再生制御）— 効果音/BGMやチャイム。現行はTTSのみで不要、拡張時に。

## C. フロントエンド / PWA / アプリ

21. ◎ **TypeScript**（型安全）— 全レイヤ共通。現行。
22. ◎ **esbuild**（バンドラ）— 高速・軽量。現行 `build-web.ts`。
23. ◎ **Service Worker (自前 SWR)**（オフライン/自動更新）— 現行で stale-while-revalidate 化済み。
24. ○ **Workbox**（SW生成）— プリキャッシュ/ルーティングを宣言的に。規模拡大時に自前SWを置換候補。
25. ○ **Vite**（開発体験）— HMR・プラグイン充実。アプリ本格化時の dev サーバ。
26. ◎ **Next.js 16 (App Router)**（本番アプリ）— README 既定スタック。SSR/ルーティング/SEO。
27. ○ **shadcn/ui + Tailwind CSS**（UI）— README 既定。アクセシブルな部品を素早く。
28. ○ **Radix UI**（アクセシブルプリミティブ）— shadcn の基盤。ARIA を標準担保。
29. △ **Astro**（コンテンツ主体サイト）— 解説/ブログの静的配信に高速。アプリ本体はNext想定で限定。
30. ○ **PWA install + Web App Manifest**（ホーム追加）— 現行 manifest あり。継続率に効く。

## D. バックエンド / DB / 認証 / 決済

31. ◎ **Supabase (Postgres + Auth + Storage)**（BaaS）— README 既定。RLS で個人開発に好適。`supabase/migrations` 済。
32. ○ **Supabase Edge Functions (Deno)**（サーバレス）— 集計/生成のサーバ処理。Webhook受け。
33. ○ **Drizzle ORM**（型安全SQL）— TS と Postgres を型で接続。Prismaより軽量。
34. △ **Prisma**（ORM）— 機能豊富だが重め。Drizzle を一次推奨。
35. ◎ **Stripe**（決済/サブスク）— README 既定。会員制。日本対応・請求書/税。
36. ○ **Stripe Customer Portal**（解約/支払い管理）— 自前実装回避でコンプラ安全。
37. △ **Clerk / Auth0**（認証）— Supabase Auth で足りるため将来の選択肢に留める。
38. ○ **Cloudflare (CDN/R2/Workers)**（配信/エッジ）— 低コストCDN・R2は画像/音源保管に安い。
39. ○ **Upstash Redis**（レート制限/キャッシュ）— サーバレス課金。生成API保護に。
40. △ **PlanetScale/Neon**（サーバレスDB）— Supabase一本化が運用簡。冗長化時に。

## E. コンテンツ作成（図・数式・回路・Markdown）

41. ◎ **KaTeX**（数式表示）— 軽量・高速。問題/解説の数式レンダリング。MathJaxより速い。
42. ○ **MathJax**（数式表示）— 互換性最強。KaTeX非対応記法のフォールバック。
43. ◎ **Obsidian + Markdown**（vault配布）— README 既定。現行 `export-vault.ts`。
44. ○ **CircuitikZ / TikZ (LaTeX)**（回路図）— 高品質な回路図をコードで再現可能・出典明確。
45. ○ **Mermaid**（ブロック図/フロー）— 学習フローや系統図の簡易作図。GitHubでも描画。
46. ○ **draw.io (diagrams.net)**（手作図）— 複雑な単線結線図。脱AI画像で信頼性。
47. ○ **SVG手書き/Excalidraw**（脱slop図）— 「自作図」を担保（09-anti-slop の方針）。
48. △ **Inkscape**（ベクタ整形）— 図の清書。頻度低め。
49. ○ **Pandoc**（形式変換）— Markdown↔PDF/LaTeX/EPUB。問題集の配布物生成。
50. △ **Typst**（新組版）— PDF問題集を高速組版。LaTeX代替として将来評価。

## F. CI/CD・品質・テスト

51. ◎ **Biome**（lint+format）— 高速・単一ツール。現行採用。
52. ◎ **Vitest**（ユニットテスト）— 現行182件。高速・ESM親和。
53. ◎ **GitHub Actions**（CI 品質ゲート）— 現行 `validate.yml`。問題データ検証を必須化。
54. ○ **Playwright**（E2E/PWA・音声UI）— ブラウザ実機でSW/音声UIの回帰検出。`speechSynthesis` はモック。**現状は重い依存(ブラウザバイナリ)を避け、純ロジック97%＋バンドル/HTMLスモークで代替。UI複雑化時に導入**（`tests/web/bundle-smoke.test.ts` が暫定の生存確認）。
55. ○ **@vitest/coverage-v8**（カバレッジ）— 現行devDep。閾値ゲート化で品質可視化。
56. ○ **Lighthouse CI**（PWA/性能/A11y 計測）— PWAスコア・アクセシビリティを自動採点。
57. ○ **Renovate / Dependabot**（依存更新）— 現行 dependabot 有り。Renovateは粒度細かい。
58. ○ **Changesets**（バージョン/変更履歴）— 問題データ/ライブラリの版管理を自動化。
59. ○ **typescript-eslint（型対応lint）**（補完）— Biome未カバーの型ルールが必要なら併用。
60. △ **Stryker（ミューテーションテスト）**（検算ロジックの強度測定）— 検算の抜けを暴く。重いので限定。

## G. データ / 分析 / 計測

61. ◎ **UTM パラメータ設計**（流入計測）— 現行 `lib/analytics/utm.ts`。発信→アプリの導線可視化。
62. ○ **Plausible / Umami（自前可・Cookieレス）**（プライバシー配慮解析）— GA4より軽量・GDPR安全。
63. △ **PostHog**（プロダクト分析/ファネル/フラグ）— 機能フラグ・録画。規模拡大時に強力、重め。
64. ✕ **Google Analytics 4（無条件導入）** — 同意管理/プライバシー負担。Plausible系を一次推奨。
65. ○ **Supabase（学習ログ集約）**（正答率/弱点の母集団）— 難易度補正の一次ソース。RLSで保護。
66. ○ **DuckDB**（ローカル分析）— 学習ログ/問題統計のアドホック分析を手元で高速に。
67. ○ **Metabase**（BIダッシュボード）— KPI/正答率の可視化（07-analytics 週次レビュー）。
68. △ **Grafana**（時系列監視）— 運用メトリクス向け。学習分析にはMetabaseが適。
69. ○ **Sentry**（エラー監視）— アプリ/SWの例外捕捉。音声再生失敗の実地把握。
70. △ **OpenTelemetry**（トレース）— サーバ化後の可観測性。現段階は過剰。

## H. 自動化・配信・X 運用

71. ◎ **n8n**（ワークフロー自動化）— README/docs 既定。過去問取込・リマインダー・集計の糊。
72. ○ **GitHub Actions（cron）**（定期実行）— 「今日の一問」生成や週次KPIを無料枠で。
73. ○ **X API（下書きエクスポート主体）**（投稿）— 現行 `x-client.ts`。無料枠縮小/凍結回避で下書き既定。
74. ○ **Buffer / Typefully**（予約投稿）— API依存を避けた半自動運用。スレッド投稿に強い。
75. ○ **Resend / Postmark**（トランザクションメール）— 通知/リマインダー（`lib/notify`）の送信基盤。
76. ○ **Web Push (VAPID)**（PWA通知）— オフラインアプリの復習リマインド。Supabase/自前SWで実装。
77. △ **Discord / Slack Bot**（コミュニティ儀式）— 現行 `lib/community`。出戻り歓迎/卒業ロール自動化。
78. ○ **OG画像生成（@vercel/og / satori）**（シェアカード画像化）— 現行は文言のみ。画像化で拡散力。
79. △ **Zapier / Make**（ノーコード連携）— n8n自前運用を一次推奨（コスト/データ主権）。
80. ○ **RSS/Podcast feed 生成**（聞き流し配信）— 「今日の法規3問」を音声配布（C18 ffmpeg と連携）。

## I. 学習科学 / SRS / ライブラリ

81. ◎ **ts-fsrs**（FSRSスケジューラ）— 現行依存。SM-2より高精度な間隔反復。
82. ◎ **自前 SM-2 実装**（軽量SRS）— 現行 `scheduler/sm2.ts`。オフラインで十分。
83. ○ **FSRS最適化（実ログでパラメータ調整）**（定着率向上）— 学習ログ蓄積後にパーソナライズ。
84. ○ **アクティブリコール設計**（出題→間→正解）— 現行音声台本に実装済。テスト効果の活用。
85. ○ **インターリービング**（topic分散）— 現行 `buildPlaylist.interleave`。混在学習で転移促進。
86. ○ **二重符号化（音声＋字幕）**（記憶定着）— 現行 `aria-live` 字幕。視聴覚の併用。
87. △ **語呂合わせDB（法規数値）**（暗記補助）— 解説に併設し読み上げ（カタログ#84）。
88. ○ **難易度の実測補正（正答率）**（適応出題）— stats.correct_rate で★を動的補正。
89. △ **項目反応理論(IRT)エンジン**（精緻な能力推定）— データ量が要る。将来。
90. ○ **学習分析（離脱/定着の相関）**（A/B 最適化）— 間の長さ・速度で定着比較（カタログ#94）。

## J. 配布 / モバイル / 収益化 / 運用

91. ◎ **GitHub Pages**（無料ホスティング）— 現行 `deploy-pages.yml`。PWA配信に十分。
92. ○ **Cloudflare Pages / Vercel**（本番ホスティング）— Next.js本番。プレビュー/エッジ。
93. ○ **Capacitor**（PWA→ネイティブ）— 同一コードでiOS/Android化。ストア配信・課金連携。
94. △ **Tauri**（軽量デスクトップ）— 手元学習アプリのデスクトップ版。優先度低。
95. ○ **RevenueCat**（アプリ内課金）— ストア課金の抽象化。Capacitor採用時に有力。
96. ○ **Crowdin / Weblate**（用語/文言管理）— 用語統一・誤読報告→読み辞書反映のループ運用。
97. ○ **Stripe Webhook + 計測連携**（収益計測）— LTV/解約の可視化（07-monetization）。
98. ○ **Sentry Release/Source maps**（本番デバッグ）— 現行 source map 出力と連携。
99. ○ **Cloudflare R2 / Supabase Storage**（音源・画像保管）— 事前生成TTS音源/回路図の配信。
100. ○ **Dependabot + CodeQL（GitHub）**（依存/セキュリティ）— 既知脆弱性の自動検知（現行 dependabot 有）。

---

## 推奨スタック要約（今すぐ / 次 / 将来）

| フェーズ | 採用（◎） |
|---|---|
| 現行（実装済/直近） | TypeScript・zod・ajv・esbuild・Biome・Vitest・GitHub Actions・Web Speech API・MediaSession・自前SW(SWR)・ts-fsrs/SM-2・Obsidian/Markdown・GitHub Pages・Anthropic SDK |
| 次の一手（○・低コスト高効果） | KaTeX（数式）・VOICEVOX（高品質日本語TTS・事前生成）・Playwright（E2E）・Lighthouse CI（PWA/A11y）・Plausible（解析）・Web Push（復習通知）・@vercel/og（シェア画像）・Drizzle（Supabase接続）・n8n（自動化） |
| 本格化（△・規模拡大後） | Next.js+shadcn・Stripe・Capacitor+RevenueCat・PostHog・SymPy検算・FSRS最適化・IRT |

### 選定の指針（このプロジェクト固有）
- **正解の正しさ**は常にコード（決定論ソルバ）で担保し、LLM/外部APIは文章・補助のみ（A10 を不採用に固定）。
- **オフライン/無料**を最優先（Web Speech・VOICEVOX・GitHub Pages・Plausible/自前計測）。クラウドTTSやBIは効果が費用を上回る局面でのみ。
- **データ主権/コンプラ**（CC-BY-SA の問題データ、出典必須）に沿い、計測はCookieレス・自前寄り、自動化は n8n 自前運用を一次に。
- 既存の**抽象（`Narrator`/`Speaker`/`Scheduler`/`StorageLike`）**に載るものを優先（差し替え容易・テスト可能）。
