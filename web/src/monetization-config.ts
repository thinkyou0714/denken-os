/**
 * monetization-config.ts — 収益化（フリーミアム）の設定。
 *
 * 戦略は docs/x-strategy/07-monetization-failure-hedge.md（無料=サンプル/本編=Pro）、
 * 販売開始手順は docs/strategy/monetization-setup.md を参照。
 *
 * 重要: `publicKeyJwk` が null の間、機能ゲートは一切作動しない（全機能無料のまま）。
 * 販売者が `npm run license:keygen` で鍵ペアを生成し、公開鍵をここへ貼って
 * `purchaseUrl` を設定した時点で初めてフリーミアムが有効になる。
 * 秘密鍵（d を含む JWK）は絶対にここへ貼らないこと。
 */

import type { LicenseJwk } from "./license.js";

export interface MonetizationConfig {
  /** キルスイッチ。false にすると鍵設定済みでも全ゲートを即時解除する。 */
  enabled: boolean;
  /** 無料プランの1日の演習（学習タブの新規解答）上限。復習・公式集は無料のまま。 */
  freeDailyLimit: number;
  /** 決済ページ URL（Stripe Payment Link / BOOTH / note 等）。空なら購入ボタンを出さない。 */
  purchaseUrl: string;
  /** license:keygen が出力する「公開鍵」JWK。null の間は収益化そのものが無効。 */
  publicKeyJwk: LicenseJwk | null;
}

export const MONETIZATION: MonetizationConfig = {
  enabled: true,
  // 無料でも標準目標（10問/日）まで学べる線引き。本気層（20問/日）と模試・ドリルが Pro。
  // 戦略 doc の表では無料=「今日の一問」だが、成長ループ（無料で価値提供）を殺さないため
  // 緩めから開始する。絞る場合はこの1定数を変えるだけでよい。
  freeDailyLimit: 10,
  purchaseUrl: "",
  publicKeyJwk: null,
};

/** 収益化が実際に作動する状態か（キルスイッチ ON かつ 公開鍵設定済み）。 */
export function monetizationConfigured(cfg: MonetizationConfig = MONETIZATION): boolean {
  return cfg.enabled && cfg.publicKeyJwk !== null && cfg.freeDailyLimit >= 1;
}
