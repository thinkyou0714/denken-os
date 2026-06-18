/**
 * ui/toast.ts — 画面下中央のトースト通知。
 * 任意のアクションボタン付き。グローバルエラートーストは 8 秒で自動消滅（I-060）。
 *
 * キュー方式（順次表示）: 連続した祝賀（レベルアップ＋クエスト達成など）を同フレームで
 *   showToast すると、旧実装は前のトーストを即 remove していて最後の1件しか見えなかった。
 *   ここでは要求をキューに積み、1件ずつ表示する（自動消滅 or 手動クローズで次へ進む）。
 * キュー機構は DOM 非依存の ToastQueue（toast-queue.ts）に切り出してテスト可能にする。
 */
import { h } from "./dom.js";
import { ToastQueue } from "./toast-queue.js";

/** 自動消滅なしのトーストが滞留してキューを止めないための上限（ms）。 */
const MAX_VISIBLE_MS = 6000;

/** DOM へトーストを描画し、自動消滅 or 手動クローズで done() を呼ぶ。 */
const queue = new ToastQueue((req, done) => {
  // 既存トーストが残っていれば除去（防御的・通常はキュー制御で1件のみ）。
  document.querySelector(".toast")?.remove();

  /** 自動消滅タイマー。手動クローズ時に必ず解除してリークを防ぐ。 */
  let timer: ReturnType<typeof setTimeout> | null = null;
  let closed = false;

  const close = (runAction: boolean): void => {
    if (closed) return;
    closed = true;
    if (timer !== null) {
      clearTimeout(timer); // 自動消滅タイマーのリークを断つ。
      timer = null;
    }
    toast.remove();
    if (runAction) req.action();
    done(); // 次のトーストへ。連続表示が潰れないように1件ずつ進める。
  };

  const toast = h(
    "div",
    {
      class: "toast",
      role: "status",
      "aria-live": "polite",
      "aria-atomic": "true",
    },
    h("span", {}, req.message),
    h(
      "button",
      {
        type: "button",
        "aria-label": `${req.message}を閉じる: ${req.actionLabel}`,
        onclick: () => close(true),
      },
      req.actionLabel,
    ),
  );
  document.body.appendChild(toast);

  // 自動消滅指定があればそれを、無ければ滞留防止の上限で次へ進める（アクションは実行しない）。
  const ms = req.autoCloseMs > 0 ? req.autoCloseMs : MAX_VISIBLE_MS;
  timer = setTimeout(() => close(false), ms);
});

/** 画面下中央のトースト（任意のアクションボタン付き）。
 * II-158: aria-live="polite" + aria-atomic="true" でスクリーンリーダーへ確実に告知。
 * 連続呼び出しはキューに積まれ、1件ずつ順次表示される。
 * @param autoCloseMs 自動消滅ミリ秒（0=自動消滅なし。ただしキューを止めないため上限で次へ進む）。既定 0。
 */
export function showToast(message: string, actionLabel: string, action: () => void, autoCloseMs = 0): void {
  queue.push({ message, actionLabel, action, autoCloseMs });
}

/** キューと表示状態をリセットする（テスト用）。 */
export function _resetToastQueue(): void {
  queue.reset();
  document.querySelector(".toast")?.remove();
}
