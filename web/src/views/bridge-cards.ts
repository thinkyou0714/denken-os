/**
 * views/bridge-cards.ts — 橋渡し収益の UI 部品（薄い DOM グルー）。
 * 判定・計測ロジックは bridge.ts / bridge-config.ts / gear-guide.ts に置き、ここは表示のみ。
 * 全カードは config 未設定なら null を返す（呼び出し側は falsy を append しない規約）。
 * アフィリエイトリンクには必ず開示バッジ（ステマ規制対応）を添える。
 */

import { withUtm } from "../../../lib/analytics/utm.js";
import { exportLedgerJson, nudgeOptedOut, recordClick, recordShown, setNudgeOptOut } from "../bridge.js";
import { affiliateActive, BRIDGE } from "../bridge-config.js";
import { GEAR_SECTIONS, gearItemUrl } from "../gear-guide.js";
import { storage } from "../state/app.js";
import { h } from "../ui/dom.js";
import { showToast } from "../ui/toast.js";

/** 景表法ステマ規制対応の開示バッジ（D16/A2）。リンクの近傍に必ず置く。 */
export function disclosureBadge(kind: "affiliate" | "ad" = "affiliate"): HTMLElement {
  return h(
    "span",
    { class: "muted small", style: "border:1px solid currentColor;border-radius:3px;padding:0 .3em;margin-left:.4em" },
    kind === "affiliate" ? "PR・アフィリエイト" : "PR",
  );
}

/** 外部リンクを開くボタン（クリックを台帳へ記録）。 */
function outboundButton(label: string, url: string, placement: string, campaign: string, cls = "chip"): HTMLElement {
  return h(
    "button",
    {
      class: cls,
      type: "button",
      onclick: () => {
        recordClick(storage, placement, campaign);
        window.open(url, "_blank", "noopener,noreferrer");
      },
    },
    label,
  );
}

// ---- 教材ガイド（公式タブ末尾。A5/A6-A13/A10/A11/D15） ----

/** 教材ガイド全体。リンクは常に出す（タグ未設定=素の検索リンク・開示バッジなし）。 */
export function gearGuideSection(): HTMLElement {
  const affiliate = affiliateActive();
  const wrap = h(
    "div",
    { class: "card" },
    h("strong", {}, "📚 教材ガイド"),
    h(
      "p",
      { class: "muted small" },
      "独学の定番教材の選び方。アプリ（反復・記録）と紙の教材（記述練習・通読）は補完関係です。" +
        (affiliate ? " 以下のリンクはアフィリエイトを含みます（購入で運営者に紹介料が入ります）。" : ""),
    ),
  );
  if (affiliate) wrap.querySelector("strong")?.append(disclosureBadge("affiliate"));
  for (const sec of GEAR_SECTIONS) {
    const det = h("details", {}, h("summary", {}, sec.heading));
    det.append(h("p", { class: "muted small" }, sec.intro));
    for (const item of sec.items) {
      recordShown(storage, "gear", sec.id);
      const row = h(
        "div",
        { style: "margin:.3em 0" },
        outboundButton(`🔗 ${item.title}`, gearItemUrl(item), "gear", `${sec.id}:${item.keyword}`),
        h("div", { class: "muted small" }, item.note),
      );
      det.append(row);
    }
    wrap.append(det);
  }
  // 講座スロット（A15）: 提携承認後に URL 設定で発火。
  if (BRIDGE.courseUrl !== "" && BRIDGE.courseLabel !== "") {
    const det = h("details", {}, h("summary", {}, "通信講座"));
    det.append(
      h(
        "div",
        { style: "margin:.3em 0" },
        outboundButton(`🔗 ${BRIDGE.courseLabel}`, BRIDGE.courseUrl, "gear", "course"),
        disclosureBadge("affiliate"),
      ),
    );
    wrap.append(det);
  }
  // BOOTH 公式集 PDF（B25）。
  if (BRIDGE.boothUrl !== "") {
    wrap.append(
      h(
        "div",
        { class: "muted small", style: "margin-top:.4em" },
        "紙で書き込みたい人へ: ",
        outboundButton("印刷用PDF版（BOOTH）", BRIDGE.boothUrl, "formulas", "booth-pdf"),
      ),
    );
  }
  return wrap;
}

// ---- 設定タブのカード群 ----

/** 応援（寄付）カード（D3/D4）。supportUrl 未設定なら null。 */
export function supportCard(): HTMLElement | null {
  if (BRIDGE.supportUrl === "") return null;
  recordShown(storage, "settings", "support");
  return h(
    "div",
    { class: "card" },
    h("label", {}, "開発を応援する "),
    outboundButton("☕ 応援ページを開く", BRIDGE.supportUrl, "settings", "support", "choice"),
    h(
      "div",
      { class: "muted" },
      "見返りのない寄付（応援）です。Pro ライセンスとは別で、機能は変わりません。" + "無料のままでも十分うれしいです。",
    ),
  );
}

/** 作者コンテンツ（note/BOOTH）カード（B17）。両方未設定なら null。 */
export function creatorContentCard(): HTMLElement | null {
  if (BRIDGE.noteUrl === "" && BRIDGE.boothUrl === "") return null;
  recordShown(storage, "settings", "creator");
  const card = h(
    "div",
    { class: "card" },
    h("label", {}, "作者の攻略コンテンツ "),
    h("div", { class: "muted" }, "勉強法・挑戦の記録はテキストで深掘りしています（アプリは道具、読み物は作戦）。"),
  );
  if (BRIDGE.noteUrl !== "")
    card.append(outboundButton("📖 note（勉強法・記録）", BRIDGE.noteUrl, "settings", "note", "choice"));
  if (BRIDGE.boothUrl !== "")
    card.append(outboundButton("🛒 BOOTH（PDF教材）", BRIDGE.boothUrl, "settings", "booth", "choice"));
  return card;
}

/** 招待リンクカード（C11）。appUrl 未設定なら null。識別子は一切埋め込まない。 */
export function inviteCard(): HTMLElement | null {
  if (BRIDGE.appUrl === "") return null;
  const url = withUtm(BRIDGE.appUrl, { source: "invite", medium: "referral", campaign: "invite" });
  return h(
    "div",
    { class: "card" },
    h("label", {}, "友達を招待 "),
    h(
      "button",
      {
        class: "choice",
        type: "button",
        onclick: () => {
          recordClick(storage, "settings", "invite");
          void navigator.clipboard?.writeText(url).then(
            () => showToast("✅ 招待リンクをコピーしました", "OK", () => {}),
            () => showToast("⚠️ コピーできませんでした", "OK", () => {}),
          );
        },
      },
      "🔗 招待リンクをコピー",
    ),
    h("div", { class: "muted" }, "一緒に勉強する仲間へ。リンクに個人情報は含まれません。"),
  );
}

/** 収益導線オプトアウト（C18）。収益化/橋渡しのどれかが動いているときだけ意味を持つ。 */
export function nudgeOptOutCard(): HTMLElement {
  const sel = h("select", {}) as HTMLSelectElement;
  sel.append(h("option", { value: "" }, "表示する"), h("option", { value: "1" }, "表示しない"));
  sel.value = nudgeOptedOut(storage) ? "1" : "";
  sel.addEventListener("change", () => setNudgeOptOut(storage, sel.value === "1"));
  return h(
    "div",
    { class: "card" },
    h("label", {}, "応援・コンテンツのご案内 "),
    sel,
    h("div", { class: "muted" }, "達成時などに出る応援・読み物のご案内を止められます（機能には影響しません）。"),
  );
}

/** 計測データの手動エクスポート（C13）。台帳が空でも出す（挙動の透明性）。 */
export function ledgerExportCard(): HTMLElement {
  return h(
    "div",
    { class: "card" },
    h("label", {}, "導線の計測データ "),
    h(
      "button",
      {
        class: "choice",
        type: "button",
        onclick: () => {
          void navigator.clipboard?.writeText(exportLedgerJson(storage)).then(
            () => showToast("✅ 計測データ(JSON)をコピーしました", "OK", () => {}),
            () => showToast("⚠️ コピーできませんでした", "OK", () => {}),
          );
        },
      },
      "📋 集計JSONをコピー",
    ),
    h(
      "div",
      { class: "muted" },
      "リンクの表示/クリック回数はこの端末内にのみ保存されます（自動送信はありません）。週次レビュー用の手動書き出しです。",
    ),
  );
}

/** 法的情報（特商法テンプレ・返金・開示。D17/D18/A3）。 */
export function legalCard(): HTMLElement {
  const name = BRIDGE.sellerName !== "" ? BRIDGE.sellerName : "（販売者が bridge-config.ts に記入）";
  const contact = BRIDGE.sellerContact !== "" ? BRIDGE.sellerContact : "（同上・メールアドレス等）";
  return h(
    "div",
    { class: "card" },
    h("label", {}, "法的情報・開示 "),
    h(
      "details",
      {},
      h("summary", {}, "特定商取引法に基づく表記（テンプレ）"),
      h(
        "div",
        { class: "muted small" },
        `販売者: ${name} ／ 連絡先: ${contact} ／ 所在地: 請求があれば遅滞なく開示します。` +
          " 価格: 各購入ページに税込表示 ／ 支払時期: 購入時 ／ 引渡時期: 決済確認後、ライセンスキーを遅滞なく送付。",
      ),
      h(
        "div",
        { class: "muted small" },
        "返金: キー発行後の返金は原則できません（デジタル商品の性質上）。二重購入・キーが技術的に機能しない場合は連絡先までご相談ください（確認のうえ返金・キー無効化で対応します）。",
      ),
    ),
    h(
      "details",
      {},
      h("summary", {}, "アフィリエイト・広告の開示"),
      h(
        "div",
        { class: "muted small" },
        "教材ガイド等のリンクにはアフィリエイトリンクが含まれる場合があります（購入で運営者に紹介料が入ります。価格は変わりません）。" +
          "Amazonのアソシエイトとして、運営者は適格販売により収入を得ています。レビューの結論を金銭で変えることはありません。",
      ),
    ),
    h(
      "div",
      { class: "muted small" },
      "方針の全文: docs/strategy/monetization-policy.md（無料機能の保護原則・寄付とProの区分・OSSと課金の両立）",
    ),
  );
}

// ---- 進捗・模試・学習タブ向けの文脈カード ----

/** 弱点科目→攻略noteリンクのチップ（B19/A18）。設定済み科目のみ。無ければ null。 */
export function subjectNoteChip(subject: string, placement: string): HTMLElement | null {
  const url = BRIDGE.subjectNoteUrls[subject];
  if (!url) return null;
  recordShown(storage, placement, `note-${subject}`);
  return outboundButton(`📖 ${subject}の攻略を読む`, url, placement, `note-${subject}`);
}

/** 模試判定後の攻略記事カード（B18）。noteUrl 未設定なら null。 */
export function examNoteCard(): HTMLElement | null {
  if (BRIDGE.noteUrl === "") return null;
  recordShown(storage, "exam", "note");
  return h(
    "div",
    { class: "card" },
    h("strong", {}, "📖 この結果の活かし方"),
    h("div", { class: "muted small" }, "判定の読み方・次の一手は note で解説しています（アプリは判定、記事は作戦）。"),
    outboundButton("攻略記事を読む", BRIDGE.noteUrl, "exam", "note"),
  );
}

/** 深掘り一冊（A17）: 採点結果の下に閉じた details で1冊だけ。affiliate時は開示つき。 */
export function deepDiveBook(subject: string): HTMLElement | null {
  const sec = subject === "電力管理" || subject === "機械制御" ? GEAR_SECTIONS[1] : GEAR_SECTIONS[0];
  const item = sec?.items[0];
  if (!item) return null;
  const det = h(
    "details",
    { class: "muted small" },
    h("summary", {}, "📚 この分野を紙で深掘りするなら"),
    h(
      "div",
      { style: "margin:.3em 0" },
      outboundButton(`🔗 ${item.title}`, gearItemUrl(item), "practice", `deepdive:${sec.id}`),
      affiliateActive() ? disclosureBadge("affiliate") : "",
      h("div", { class: "muted small" }, item.note),
    ),
  );
  return det;
}
