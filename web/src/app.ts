/**
 * app.ts — 電験二種 学習OS（オフライン PWA）のエントリポイント。
 * タブ型 SPA: 学習 / 復習 / 模試 / 質問 / 進捗 / 公式 / 設定。
 * 各画面の実装は web/src/views/** へ分割（G6）。
 */

import { reloadProblems } from "./app-init.js";
import { onKeydown } from "./keyboard.js";
import { getTheme } from "./settings.js";
import type { InstallPromptEvent } from "./state/app.js";
import { applyTheme, loadFailed, setInstallPrompt, storage } from "./state/app.js";
import { showToast } from "./ui/toast.js";
import { runFreezeBridge } from "./views/practice.js";
import { renderHeader, renderNav, updateNetStatus } from "./views/router.js";

/** 読込中のスケルトン（problems.json 取得まで）。 */
function renderSkeleton(): void {
  const view = document.getElementById("view");
  if (view) {
    view.innerHTML =
      '<div class="skel-line skeleton w40"></div><div class="skel-line skeleton big"></div>' +
      '<div class="skel-line skeleton"></div><div class="skel-line skeleton w60"></div>' +
      '<div class="skel-line skeleton"></div><div class="skel-line skeleton"></div>';
  }
}

/** Service Worker 登録＋更新検知（新版があればトーストで再読込を案内）。 */
function registerServiceWorker(): void {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker
    .register("./sw.js")
    .then((reg) => {
      reg.addEventListener("updatefound", () => {
        const sw = reg.installing;
        if (!sw) return;
        sw.addEventListener("statechange", () => {
          // 既存コントローラがある状態で新版が installed = 更新あり。
          if (sw.state === "installed" && navigator.serviceWorker.controller) {
            showToast("新しいバージョンがあります", "更新", () => location.reload());
          }
        });
      });
    })
    .catch(() => {});
}

async function main(): Promise<void> {
  applyTheme();
  // system 設定時は OS のテーマ変更に追従。
  matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", () => {
    if (getTheme(storage) === "system") applyTheme();
  });
  // ストリークお守り: 欠席日があれば自動で肩代わりして連続を守る。
  // 起動時に加え、タブを開きっぱなしで日をまたぐ PWA 利用に備えて再表示時にも確認する。
  runFreezeBridge();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      runFreezeBridge();
      renderHeader();
    }
  });
  // A2HS: ブラウザのインストール提案を横取りして、価値実感後（ストリーク3日）に自分のタイミングで出す。
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    setInstallPrompt(e as InstallPromptEvent);
  });
  window.addEventListener("appinstalled", () => {
    setInstallPrompt(null);
  });
  // 想定外の実行時エラーでも「壊れた」と思わせない（学習記録の安全を伝える。1セッション1回）。
  // グローバルエラートーストは 8 秒で自動消滅（I-060）。
  let errorToastShown = false;
  const onGlobalError = () => {
    if (errorToastShown) return;
    errorToastShown = true;
    showToast("⚠️ 問題が発生しました。学習記録は安全です", "再読込", () => location.reload(), 8000);
  };
  window.addEventListener("error", onGlobalError);
  window.addEventListener("unhandledrejection", onGlobalError);
  renderNav();
  renderSkeleton();
  await reloadProblems();
  document.addEventListener("keydown", onKeydown);
  // オフライン状態の変化をヘッダに反映（完全オフライン動作だが状態は明示する）。
  // II-165: オンライン復帰時に自動リトライ（loadFailed のときだけ再取得）。
  window.addEventListener("online", () => {
    updateNetStatus();
    // loadFailed 状態のときだけ自動リトライ（二重ロードフラグはapp-init側で管理）。
    if (loadFailed) void reloadProblems();
  });
  window.addEventListener("offline", updateNetStatus);
  registerServiceWorker();
}

void main();
