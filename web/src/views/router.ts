/**
 * views/router.ts — TABS定義・ヘッダ・ナビ・ルーティング・エラーバウンダリ。
 */

import { recoveryView } from "../errors.js";
import { buildStudyPlan } from "../plan.js";
import { dailyReviewBatch, offlineLabel } from "../retention.js";
import { getDailyGoal, getExamDate, getReviewCap } from "../settings.js";
import { problems, progress, setView, storage, view } from "../state/app.js";
import { exam } from "../state/exam.js";
import { $, h } from "../ui/dom.js";
import { renderChat } from "./chat.js";
import { renderDashboard } from "./dashboard.js";
import { renderExam } from "./exam.js";
import { renderFormulas } from "./formulas.js";
import { currentLevel, freezeInfo, renderPractice } from "./practice.js";
import { renderReview } from "./review.js";
import { renderSettings } from "./settings.js";

export const TABS: ReadonlyArray<readonly [string, string, string]> = [
  ["practice", "学習", "✏️"],
  ["review", "復習", "🔁"],
  ["exam", "模試", "📝"],
  ["chat", "質問", "💬"],
  ["dashboard", "進捗", "📊"],
  ["formulas", "公式", "📐"],
  ["settings", "設定", "⚙️"],
];

export function renderHeader(): void {
  const lv = currentLevel();
  $("xp").textContent = `Lv.${lv.level} ⚡${lv.totalXp.toLocaleString("ja-JP")}`;
  $("xp").setAttribute("title", `${lv.title} ・ 次のレベルまで ${lv.xpNeed - lv.xpInto} XP`);
  const fi = freezeInfo();
  $("streak").textContent = `🔥 ${fi.streak}日${fi.state.count > 0 ? ` 🧊×${fi.state.count}` : ""}`;
  $("streak").setAttribute(
    "title",
    fi.state.count > 0
      ? `連続学習${fi.streak}日 ・ お守り${fi.state.count}個（欠席日を自動カバー）`
      : `連続学習${fi.streak}日`,
  );
  const days = buildStudyPlan({
    examDateIso: getExamDate(storage),
    totalProblems: problems.length,
    todayCount: 0,
    dailyGoal: getDailyGoal(storage),
  }).daysLeft;
  $("countdown").textContent = `試験まで ${days} 日`;
  updateNetStatus();
}

/** オフライン表示の更新（オンライン時は隠す）。完全オフライン動作なので障害ではなく状態通知。 */
export function updateNetStatus(): void {
  const el = document.getElementById("netstatus");
  if (!el) return;
  const label = offlineLabel(navigator.onLine);
  el.textContent = label;
  el.hidden = label === "";
}

export function renderNav(): void {
  const nav = $("nav");
  nav.innerHTML = "";
  // 復習バッジは「今日出す分」（上限でバッチ化）の件数に合わせ、過大表示で圧迫しない。
  // 完了した復習は FSRS が due から外すため、ここでは上限キャップのみ適用する。
  const dueCount = dailyReviewBatch(progress.dueTopics(), getReviewCap(storage)).batch.length;
  for (const [id, label, icon] of TABS) {
    const due = id === "review" ? dueCount : 0;
    const selected = id === view;
    const btn = h(
      "button",
      {
        type: "button",
        role: "tab",
        id: `tab-${id}`,
        "aria-label": label,
        "aria-selected": selected ? "true" : "false",
        tabindex: selected ? "0" : "-1",
        onclick: () => switchView(id),
      },
      h("span", { class: "ti", "aria-hidden": "true" }, icon),
      h("span", { class: "tl" }, label),
    );
    if (due > 0) btn.append(h("span", { class: "tb" }, String(due)));
    if (selected) btn.setAttribute("aria-current", "true");
    nav.appendChild(btn);
  }
}

export function switchView(id: string): void {
  if (exam?.timerId) {
    clearInterval(exam.timerId);
    exam.timerId = null;
  }
  setView(id);
  renderNav();
  render();
}

export function render(): void {
  const root = $("view");
  root.innerHTML = "";
  // エラーバウンダリ: 描画例外でSPA全体が白画面になり「壊れた」と離脱されるのを防ぐ。
  // 例外時は安心メッセージ＋復旧導線を出し、学習記録が無事であることを伝える。
  try {
    // 開きっぱなしのタブ（visibilitychange が発火しない常時表示）で日をまたいだ場合に備え、
    // 描画のたびに欠席日のお守りカバーを確認する（冪等・通常は何もしない）。
    runFreezeBridge();
    renderHeader();
    if (view === "practice") renderPractice(root);
    else if (view === "review") renderReview(root);
    else if (view === "exam") renderExam(root);
    else if (view === "chat") renderChat(root);
    else if (view === "dashboard") renderDashboard(root);
    else if (view === "formulas") renderFormulas(root);
    else if (view === "settings") renderSettings(root);
  } catch (err) {
    renderErrorBoundary(root, err);
  }
}

/** 描画例外時の復旧画面。 */
export function renderErrorBoundary(root: HTMLElement, err: unknown): void {
  const rv = recoveryView(err);
  root.innerHTML = "";
  root.append(
    h(
      "div",
      { class: "card errbound", role: "alert" },
      h("strong", {}, `⚠️ ${rv.title}`),
      h("p", {}, rv.reassurance),
      h("button", { class: "primary", type: "button", onclick: () => location.reload() }, "再読み込み"),
      h(
        "details",
        {},
        h("summary", {}, "エラーの詳細"),
        (() => {
          const pre = h("pre", { class: "errdetail" });
          pre.textContent = rv.detail; // textContent で安全に（XSS 回避）
          return pre;
        })(),
      ),
    ),
  );
}

// runFreezeBridge は practice.ts からインポート
import { runFreezeBridge } from "./practice.js";
