/**
 * ui/toast.ts — 画面下中央のトースト通知。
 * 任意のアクションボタン付き。グローバルエラートーストは 8 秒で自動消滅（I-060）。
 */
import { h } from "./dom.js";

/** 画面下中央のトースト（任意のアクションボタン付き）。
 * II-158: aria-live="polite" + aria-atomic="true" でスクリーンリーダーへ確実に告知。
 * @param autoCloseMs 自動消滅ミリ秒（0=自動消滅なし）。既定 0。
 */
export function showToast(message: string, actionLabel: string, action: () => void, autoCloseMs = 0): void {
  document.querySelector(".toast")?.remove();
  const toast = h(
    "div",
    {
      class: "toast",
      role: "status",
      "aria-live": "polite",
      "aria-atomic": "true",
    },
    h("span", {}, message),
    h(
      "button",
      {
        type: "button",
        "aria-label": `${message}を閉じる: ${actionLabel}`,
        onclick: () => {
          toast.remove();
          action();
        },
      },
      actionLabel,
    ),
  );
  document.body.appendChild(toast);
  if (autoCloseMs > 0) {
    setTimeout(() => toast.remove(), autoCloseMs);
  }
}
