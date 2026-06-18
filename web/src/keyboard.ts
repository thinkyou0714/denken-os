/**
 * keyboard.ts — ショートカット・キーボードヘルプ。
 * aria-modal="true"、Escape で閉じる、閉じたら呼び出し元へフォーカス返却（I-058）。
 */

import { view } from "./state/app.js";
import { $, h } from "./ui/dom.js";
import { switchView, TABS } from "./views/router.js";

/** ヘルプダイアログの Tab トラップ用ハンドラ（閉じる際に解除するため参照を保持）。 */
let _trapHandler: ((e: KeyboardEvent) => void) | null = null;

/** ヘルプダイアログを閉じ、呼び出し元へフォーカスを返し、トラップを解除する（I-058）。 */
function closeKeyboardHelp(overlay: HTMLElement, openerEl: HTMLElement | null): void {
  if (_trapHandler) {
    document.removeEventListener("keydown", _trapHandler, true);
    _trapHandler = null;
  }
  overlay.remove();
  openerEl?.focus();
}

/** キーボードショートカット一覧（?キー）。学習をキーボードだけで回せることを学習者に伝える。 */
export function toggleKeyboardHelp(): void {
  const existing = document.querySelector(".kbdhelp");
  if (existing) {
    // 開いているなら閉じる（トラップ解除＋フォーカス返却は keydown ハンドラ側でも担保）。
    (existing as HTMLElement).querySelector<HTMLElement>("[data-kbdclose]")?.click();
    return;
  }
  const rows: ReadonlyArray<readonly [string, string]> = [
    ["1〜9", "選択肢を解答（学習・模試）"],
    ["1〜3", "自己評価（むずかしい/できた/余裕）"],
    ["Enter", "数値の回答 ／ 次の問題へ"],
    ["← →", "タブ移動（タブにフォーカス中）"],
    ["Esc", "このヘルプを閉じる"],
    ["?", "このヘルプを開閉"],
  ];
  // 呼び出し元へフォーカスを返すために現在のフォーカス先を記録する（I-058）。
  const openerEl = document.activeElement as HTMLElement | null;
  // フォーカス可能な閉じるコントロール（I-058: ダイアログ内に明示的な閉じる操作を置く）。
  const closeBtn = h(
    "button",
    {
      type: "button",
      class: "chip",
      "data-kbdclose": "true",
      "aria-label": "ヘルプを閉じる",
      onclick: () => closeKeyboardHelp(overlay, openerEl),
    },
    "閉じる",
  );
  const overlay = h(
    "div",
    {
      class: "kbdhelp",
      role: "dialog",
      "aria-modal": "true",
      "aria-label": "キーボードショートカット",
      onclick: () => closeKeyboardHelp(overlay, openerEl),
    },
    h(
      "div",
      // カード内クリックでは閉じない（背景クリック/Escのみ）。
      { class: "card", onclick: (e) => e.stopPropagation() },
      h("strong", {}, "⌨️ キーボードショートカット"),
      ...rows.map(([key, desc]) => h("div", { class: "krow" }, h("span", { class: "kbd" }, key), h("span", {}, desc))),
      h("div", { class: "muted small" }, "背景クリック / Esc で閉じる"),
      closeBtn,
    ),
  );
  document.body.append(overlay);
  // フォーカスをダイアログ内（閉じるボタン）へ移す。
  closeBtn.focus();
  // Tab トラップ: ダイアログ内のフォーカス可能要素間でループさせる（capture で確実に捕捉）。
  _trapHandler = (e: KeyboardEvent) => {
    if (e.key !== "Tab") return;
    const focusables = Array.from(
      overlay.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'),
    ).filter((el) => !el.hasAttribute("disabled"));
    if (focusables.length === 0) return;
    const first = focusables[0] as HTMLElement;
    const last = focusables[focusables.length - 1] as HTMLElement;
    const active = document.activeElement as HTMLElement | null;
    if (e.shiftKey) {
      if (active === first || !overlay.contains(active)) {
        e.preventDefault();
        last.focus();
      }
    } else if (active === last || !overlay.contains(active)) {
      e.preventDefault();
      first.focus();
    }
  };
  document.addEventListener("keydown", _trapHandler, true);
}

export function onKeydown(e: KeyboardEvent): void {
  // Esc はヘルプを閉じる（開いていれば）。閉じたら呼び出し元へフォーカス返却（I-058）。
  if (e.key === "Escape") {
    const helpEl = document.querySelector(".kbdhelp");
    if (helpEl) {
      // overlay の onclick がフォーカス返却を担う。
      (helpEl as HTMLElement).click();
    }
    return;
  }
  // タブ（role=tab）にフォーカスがある間は左右矢印でタブ移動（WAI-ARIA tablist の定石）。
  const active = document.activeElement as HTMLElement | null;
  if (active?.getAttribute("role") === "tab" && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
    e.preventDefault();
    const ids = TABS.map(([id]) => id);
    const cur = ids.indexOf(view);
    const next = e.key === "ArrowRight" ? (cur + 1) % ids.length : (cur - 1 + ids.length) % ids.length;
    // next はモジュロ演算で [0, ids.length) の範囲内のため安全。
    switchView(ids[next] as string);
    document.getElementById(`tab-${ids[next]}`)?.focus();
    return;
  }

  const tag = (e.target as HTMLElement)?.tagName;
  if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
  if (e.key === "?") {
    e.preventDefault();
    toggleKeyboardHelp();
    return;
  }

  if (view !== "practice" && view !== "exam") return;
  const root = $("view");
  if (e.key === "Enter") {
    (root.querySelector("#next") as HTMLButtonElement | null)?.click();
    return;
  }
  const n = Number(e.key);
  if (n >= 1 && n <= 9) {
    // FSRS評価バーが出ている間は 1〜3 が評価に対応（解答→評価→次へ をキーボードだけで回せる）。
    const rate = root.querySelector(".rate");
    if (rate) {
      (rate.querySelectorAll("button")[n - 1] as HTMLButtonElement | undefined)?.click();
      return;
    }
    const choices = root.querySelectorAll(".answers .choice, #eanswers .choice");
    (choices[n - 1] as HTMLButtonElement | undefined)?.click();
  }
}
