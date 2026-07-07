/**
 * views/paywall.ts — Pro 専用機能のロックカード（薄い DOM グルー）。
 * 判定ロジックは entitlements.ts / monetization-config.ts に置き、ここは表示のみ。
 *
 * 17-C14/C15/C16/C17/B21: ペイウォールは「誠実な開示」を構造で強制する —
 * ①なぜ有料か ②無料で使い続けられる範囲 ③買い切りの明示 ④逆導線（無料機能へ返す）
 * ⑤本人の積み上げの承認（外部の社会的証明の代わりに端末内データを使う）。
 */

import { withUtm } from "../../../lib/analytics/utm.js";
import { recordClick, recordShown } from "../bridge.js";
import { BRIDGE } from "../bridge-config.js";
import { MONETIZATION } from "../monetization-config.js";
import { progress, storage } from "../state/app.js";
import { h } from "../ui/dom.js";
import { switchView } from "./router.js";

/**
 * 決済ページを開くボタン。purchaseUrl 未設定なら null（呼び出し側の分岐を不要に）。
 * placement 別の UTM を付与し（17-C2）、クリックを台帳に記録する。
 */
export function purchaseButton(cls: string, placement = "paywall"): HTMLElement | null {
  if (MONETIZATION.purchaseUrl === "") return null;
  let url = MONETIZATION.purchaseUrl;
  try {
    url = withUtm(url, { source: "app", medium: "paywall", campaign: "pro", content: placement });
  } catch {
    // purchaseUrl が URL として不正でも素のまま開く（設定ミスで導線を殺さない）。
  }
  return h(
    "button",
    {
      class: cls,
      type: "button",
      onclick: () => {
        recordClick(storage, placement, "pro");
        window.open(url, "_blank", "noopener,noreferrer");
      },
    },
    "🔑 Pro ライセンスを購入",
  );
}

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
  recordShown(storage, "paywall", opts.icon);
  const card = h(
    "div",
    { class: "card paywall" },
    h("strong", {}, `${opts.icon} ${opts.title}`),
    h("p", { class: "muted" }, opts.description),
  );
  // 本人の積み上げの承認（17-C16）: 埋没費用の煽りではなく達成の承認として書く。
  const answered = progress.logs().length;
  if (answered >= 50) {
    card.append(
      h(
        "p",
        { class: "muted small" },
        `あなたはここまで ${answered.toLocaleString("ja-JP")} 問を積み上げてきました。この続きを応援させてください。`,
      ),
    );
  }
  // 誠実開示の定型（17-C14/B21）: 無料範囲・買い切り・価格アンカー（未設定なら省略）。
  card.append(
    h(
      "p",
      { class: "muted small" },
      "Pro は開発継続を支える応援プランです。学習記録・復習・公式集・質問タブはこれからも無料で使えます。" +
        (MONETIZATION.purchaseUrl !== "" && BRIDGE.priceNote !== "" ? ` ${BRIDGE.priceNote}。` : "") +
        (BRIDGE.noteUrl !== "" ? " 勉強法や挑戦の記録は note で読めます（アプリは道具、記事は作戦）。" : ""),
    ),
  );
  const actions = h("div", { class: "drill-actions" });
  const buy = purchaseButton("primary");
  if (buy) actions.append(buy);
  actions.append(
    h(
      "button",
      { class: "chip", type: "button", onclick: () => switchView("settings") },
      "購入済みキーを入力（設定へ）",
    ),
    // 逆導線（17-C15）: 買わない選択を尊重し、行き止まりにしない。
    h(
      "button",
      {
        class: "chip",
        type: "button",
        onclick: () => {
          recordClick(storage, "paywall", "continue-free");
          switchView("review");
        },
      },
      "今は無料の復習で続ける →",
    ),
  );
  card.append(actions);
  return card;
}
