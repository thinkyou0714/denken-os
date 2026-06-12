/**
 * ui/toast.ts — 画面下中央のトースト通知。
 * 任意のアクションボタン付き。グローバルエラートーストは 8 秒で自動消滅（I-060）。
 */
import { h } from "./dom.js";

/** 画面下中央のトースト（任意のアクションボタン付き）。
 * @param autoCloseMs 自動消滅ミリ秒（0=自動消滅なし）。既定 0。
 */
export function showToast(message: string, actionLabel: string, action: () => void, autoCloseMs = 0): void {
  document.querySelector(".toast")?.remove();
  const toast = h(
    "div",
    { class: "toast", role: "status" },
    h("span", {}, message),
    h(
      "button",
      {
        type: "button",
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
