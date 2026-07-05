import type { NextConfig } from "next";

// DENKEN-OS Next.js 16 移行アプリの設定。
// 収益化は休眠設計: 課金 UI は NEXT_PUBLIC_BILLING_ENABLED（既定 false）で gate する。
// 後続タスク（docs/monetization/goals/GOALS.md）:
//   T04 @denken/core(lib) 連携 + 既存 web/ ロジック移植 / T05 Serwist offline SW（要 `next build --webpack`）
//   T06 nonce-CSP proxy.ts / T07 CI・Vercel・post-build secret scan / T10-T18 auth・Stripe。
const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
