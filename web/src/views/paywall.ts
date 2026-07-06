/**
 * views/paywall.ts — Pro 専用機能のロックカード（薄い DOM グルー）。
 * 判定ロジックは entitlements.ts / monetization-config.ts に置き、ここは表示のみ。
 */

import { MONETIZATION } from "../monetization-config.js";
import { h } from "../ui/dom.js";
import { switchView } from "./router.js";

export interface PaywallOpts {
  /** 先頭の絵文字アイコン。 */
  icon: string;
  /** 見出し（例: 「模試は Pro 機能です」）。 */
  title: string;
  /** 補足説明（なぜ有料か・無料でできることを誠実に書く）。 */
  description: string;
}

/** ロック説明＋購入導線＋ライセンス入力への導線をまとめたカード。 */
export function paywallCard(opts: PaywallOpts): HTMLElement {
  const card = h(
    "div",
    { class: "card paywall" },
    h("strong", {}, `${opts.icon} ${opts.title}`),
    h("p", { class: "muted" }, opts.description),
  );
  const actions = h("div", { class: "drill-actions" });
  if (MONETIZATION.purchaseUrl !== "") {
    actions.append(
      h(
        "button",
        {
          class: "primary",
          type: "button",
          onclick: () => window.open(MONETIZATION.purchaseUrl, "_blank", "noopener,noreferrer"),
        },
        "🔑 Pro ライセンスを購入",
      ),
    );
  }
  actions.append(
    h(
      "button",
      { class: "chip", type: "button", onclick: () => switchView("settings") },
      "購入済みキーを入力（設定へ）",
    ),
  );
  card.append(actions);
  return card;
}
