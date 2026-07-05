# web-next — DENKEN-OS Next.js 16 移行アプリ

既存の esbuild 製オフライン PWA（`../web/`）を段階的に置換する **Next.js 16 (App Router)** アプリ。
本コミット時点は **収益化の土台（LP + 料金ページ）** のみで、**課金は休眠**（`NEXT_PUBLIC_BILLING_ENABLED` 既定 OFF）。
設計の全体像は [`../docs/monetization/ARCHITECTURE.md`](../docs/monetization/ARCHITECTURE.md)、タスク分解は [`../docs/monetization/goals/GOALS.md`](../docs/monetization/goals/GOALS.md)。

## 実装済み（このコミット）
- Next 16 App Router scaffold（`app/layout.tsx` + `app/globals.css`「紙＋朱色」テーマ・依存は next/react のみ）
- LP（`app/page.tsx`）: ヒーロー + 特徴4点 + CTA
- 料金（`app/pricing/page.tsx`）: Free / Pro プラン表 + **flag-gate CTA**（`components/cta.tsx`）
- `lib/flags.ts`（`billingEnabled` / `publicBillingEnabled`）・`lib/site.ts`（表示コンテンツ単一情報源）
- 課金 OFF 時は Pro CTA を「ウェイトリスト（準備中）」にし、checkout へ遷移させない（景表法/誤認回避）

## 使い方
```bash
cd web-next
npm install
npm run build      # next build（scaffold のコンパイル検証）
npm run dev        # http://localhost:3000
npm run typecheck  # tsc --noEmit
```

## 環境変数（このアプリ）
| 変数 | 既定 | 用途 |
|---|---|---|
| `BILLING_ENABLED` | `false` | サーバ側の課金有効判定（後続の entitlement/Stripe で使用） |
| `NEXT_PUBLIC_BILLING_ENABLED` | `false` | クライアント mirror（pricing CTA の出し分け） |

> 後続タスクで追加予定（**実キーは人間が用意 = human-tasks**）:
> `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` /
> `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_PRICE_ID` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`。
> `NEXT_PUBLIC_*` のみクライアントに露出可（秘密は付けない）。

## まだ実装していない（follow-up・GOALS.md 参照）
- **T02**: ルート npm workspaces 化（`@denken/core` として `lib/` 連携）— 既存 `verify` を壊さないため本コミットでは未実施
- **T04**: 既存 `web/src`（56 module SPA）の React 移植 + `LocalProgress` 連携（offline 保持）
- **T05**: Serwist offline SW（**`next build --webpack`** + Vercel 向け `minimatch` 依存が必要）
- **T06**: nonce-CSP `proxy.ts`（Next16 で middleware 改名）+ session refresh
- **T07**: CI/Vercel + `verify` チェーン更新 + post-build secret scan
- **T10–T18**: Supabase magic-link auth / entitlement gate 配線 / Stripe checkout・webhook（**要 Supabase/Stripe/Vercel アカウント**）

## 既存 `../web/` との関係
現行の PWA（`../web/`, esbuild）は**そのまま稼働**（ルート `npm run verify` の `build:web` は不変）。
本アプリは additive で、移植が完了したら `web/` の役割を引き継ぐ。無料 CTA は当面 現行 PWA（GitHub Pages）へ着地する。
