import { identity, syncStatus } from "./cloud-storage.js";
import { renderData } from "./data-ui.js";
import { renderReviewQueue, renderToday } from "./home-ui.js";
import { type LearningOptions, renderLearning } from "./learning-ui.js";
import { renderLibrary } from "./library-ui.js";
import { renderPaper } from "./paper-ui.js";
import { renderProgress, renderStudySettings } from "./progress-ui.js";
import { focusHeading, readingControls, studyIcon } from "./study-ui.js";
import { renderTools } from "./tools-ui.js";
import { renderTutor } from "./tutor-ui.js";
import { button, h, notice } from "./ui.js";

const PAGES = [
  ["today", "今日の学習"],
  ["practice", "問題演習"],
  ["papers", "公式模試"],
  ["review", "復習"],
  ["library", "教材を探す"],
  ["notes", "学習ノート"],
  ["tools", "図と計算"],
  ["tutor", "質問する"],
  ["progress", "学習記録"],
  ["settings", "学習設定"],
  ["admin", "監修・運営"],
] as const;
let dispose = () => {};

export function renderLab(root: HTMLElement) {
  dispose();
  root.className = "study-app";
  const canReview = identity?.role === "owner" || identity?.role === "reviewer";
  const pages = canReview ? PAGES : PAGES.slice(0, -1);
  const title = h("h2", { class: "study-page-title", tabindex: "-1" });
  const status = h("span", { class: "study-sync", role: "status" }, syncStatus);
  const statusChanged = () => {
    status.textContent = syncStatus;
  };
  window.addEventListener("denken-sync", statusChanged);
  const sidebar = h("aside", { class: "study-sidebar" });
  const brand = h(
    "a",
    { class: "study-brand", href: "#lab/today", "aria-label": "DENKEN-OS 今日の学習" },
    h("img", { src: "./icon.svg", width: "32", height: "32", alt: "" }),
    h("span", {}, "DENKEN-OS"),
  );
  const nav = h("nav", { class: "study-nav", "aria-label": "学習メニュー" });
  const content = h("div", { class: "lab-content study-content" });
  const bottom = h("nav", { class: "study-bottom-nav", "aria-label": "よく使うメニュー" });
  const heading = h(
    "div",
    { class: "study-page-heading" },
    h("div", {}, h("p", { class: "study-eyebrow" }, "電験 学習ノート"), title),
    readingControls(),
  );
  const mobileHeader = h(
    "div",
    { class: "study-mobile-header" },
    h("a", { href: "#lab/today", class: "study-wordmark" }, "DENKEN-OS"),
    status,
  );
  let active = "",
    serial = 0;
  let pendingOptions: LearningOptions | undefined;
  const launch = (options: LearningOptions) => {
    pendingOptions = options;
    navigate("practice");
  };
  const navigate = (id: string) => {
    if (!pages.some(([key]) => key === id)) return;
    if (location.hash !== `#lab/${id}`) history.pushState({ view: "lab" }, "", `#lab/${id}`);
    void show(id, true);
  };
  const show = async (id: string, focus = false) => {
    const page = pages.find(([key]) => key === id) ?? PAGES[0];
    active = page[0];
    const request = ++serial;
    title.textContent = page[1];
    document.body.dataset.studyActive = "false";
    sidebar.classList.remove("is-open");
    more.setAttribute("aria-expanded", "false");
    for (const link of root.querySelectorAll<HTMLAnchorElement>("[data-study-page]")) {
      if (link.dataset.studyPage === active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    }
    const host = h("div", { class: "study-page", "data-page": active });
    content.replaceChildren(h("p", { class: "study-loading", role: "status" }, "学習内容を読み込んでいます…"));
    content.setAttribute("aria-busy", "true");
    try {
      if (active === "today") await renderToday(host, launch, navigate);
      else if (active === "practice") {
        const options = pendingOptions;
        pendingOptions = undefined;
        await renderLearning(host, { ...options, onExit: () => navigate("today") });
      } else if (active === "papers") await renderPaper(host);
      else if (active === "review") await renderReviewQueue(host, launch);
      else if (active === "library") await renderLibrary(host, launch);
      else if (active === "notes") await renderData(host);
      else if (active === "tools") renderTools(host);
      else if (active === "tutor") renderTutor(host);
      else if (active === "progress") await renderProgress(host);
      else if (active === "settings") await renderStudySettings(host);
      else await (await import("./admin-ui.js")).renderAdmin(host);
      if (request !== serial || !root.isConnected) return;
      content.replaceChildren(host);
      document.body.dataset.studyActive = String(!!host.querySelector('[data-question-active="true"]'));
      if (focus) focusHeading(title);
    } catch (error) {
      if (request !== serial) return;
      content.replaceChildren();
      notice(content, error instanceof Error ? error.message : "読み込めませんでした", true);
      content.append(button("もう一度読み込む", () => show(active, true)));
    } finally {
      if (request === serial) content.setAttribute("aria-busy", "false");
    }
  };
  const navLink = (id: string, label: string) => {
    const a = h("a", { href: `#lab/${id}`, "data-study-page": id }, studyIcon(id), h("span", {}, label));
    a.onclick = (event) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      navigate(id);
    };
    return a;
  };
  for (const [i, [id, label]] of pages.entries()) {
    if (i === 5) nav.append(h("p", { class: "study-nav-label" }, "学習のサポート"));
    nav.append(navLink(id, label));
  }
  const close = button("メニューを閉じる", () => {
    sidebar.classList.remove("is-open");
    more.setAttribute("aria-expanded", "false");
    more.focus();
  });
  close.classList.add("study-menu-close");
  sidebar.id = "study-menu";
  sidebar.append(
    brand,
    close,
    nav,
    h(
      "a",
      {
        href: "./service/ui-research.html",
        class: "study-research-link",
        target: "_blank",
        rel: "noopener noreferrer",
      },
      "画面改善の調査・設計",
    ),
  );
  for (const [id, label] of [
    ["today", "今日"],
    ["practice", "演習"],
    ["papers", "模試"],
    ["review", "復習"],
  ] as const)
    bottom.append(navLink(id, label));
  const more = button("その他", () => {
    const open = sidebar.classList.toggle("is-open");
    more.setAttribute("aria-expanded", String(open));
    if (open) close.focus();
  });
  more.replaceChildren(studyIcon("more"), h("span", {}, "その他"));
  more.setAttribute("aria-controls", "study-menu");
  more.setAttribute("aria-expanded", "false");
  bottom.append(more);
  const routeChanged = () => {
    if (!root.isConnected) return;
    const parts = location.hash.slice(1).split("/");
    if (parts[0] === "lab") void show(parts[1] ?? "today", true);
  };
  const closeOnEscape = (event: KeyboardEvent) => {
    if (event.key === "Escape" && sidebar.classList.contains("is-open")) close.click();
  };
  window.addEventListener("denken-lab-route", routeChanged);
  root.addEventListener("keydown", closeOnEscape);
  dispose = () => {
    serial++;
    window.removeEventListener("denken-sync", statusChanged);
    window.removeEventListener("denken-lab-route", routeChanged);
    root.removeEventListener("keydown", closeOnEscape);
  };
  root.replaceChildren(sidebar, h("div", { class: "study-main" }, mobileHeader, heading, content), bottom);
  void show(location.hash.split("/")[1] ?? "today");
}
