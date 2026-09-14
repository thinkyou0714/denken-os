import { safeHtml } from "../ui/dom.js";
import { button, check, h } from "./ui.js";

const PATHS: Record<string, string> = {
  today: '<path d="M3 11 12 3l9 8v9a1 1 0 0 1-1 1h-6v-7h-4v7H4a1 1 0 0 1-1-1z"/>',
  practice: '<path d="m15 4 5 5M4 20l4-1L20 7a2.1 2.1 0 0 0-3-3L5 16z"/>',
  papers: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 3h6v3H9zM9 11h6M9 15h6"/>',
  review: '<path d="M3 10a9 9 0 1 1 2 8M3 4v6h6M12 7v5l3 2"/>',
  library: '<path d="M12 5v16M3 4h5a4 4 0 0 1 4 2 4 4 0 0 1 4-2h5v15h-5a4 4 0 0 0-4 2 4 4 0 0 0-4-2H3z"/>',
  notes: '<path d="M6 3h13v18H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2M8 3v18M11 8h5M11 12h5"/>',
  tools: '<path d="M4 19V5M4 19h16M6 14l4-6 5 9 5-7"/>',
  tutor: '<path d="M21 11a8 8 0 0 1-8 8H7l-4 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4zM7 8h10M7 12h7"/>',
  progress: '<path d="M4 20V10h4v10M10 20V4h4v16M16 20v-7h4v7"/>',
  settings:
    '<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="10" cy="18" r="2"/>',
  admin: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6zM8 12l3 3 5-6"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
};

export function studyIcon(name: string) {
  return h("span", {
    class: "study-icon",
    "aria-hidden": "true",
    html: safeHtml(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${PATHS[name] ?? PATHS.library}</svg>`,
    ),
  });
}

export function disclosure(label: string, ...children: Node[]) {
  return h("details", { class: "study-details" }, h("summary", {}, label), ...children);
}

export function focusHeading(node: HTMLElement | null | undefined) {
  if (!node) return;
  node.tabIndex = -1;
  node.focus({ preventScroll: true });
  node.scrollIntoView?.({ block: "start", behavior: "instant" });
}

export function readingControls() {
  const controls = disclosure("表示設定");
  const sizes = h("div", { class: "study-segments", role: "group", "aria-label": "問題と解説の文字サイズ" });
  const current = () => (localStorage.getItem("denken:readingSize") === "large" ? "large" : "standard");
  const apply = () => {
    document.body.dataset.readingSize = current();
    for (const b of sizes.querySelectorAll<HTMLButtonElement>("button"))
      b.setAttribute("aria-pressed", String(b.dataset.size === current()));
  };
  for (const [size, label] of [
    ["standard", "標準"],
    ["large", "大きめ"],
  ] as const) {
    const b = button(label, () => {
      localStorage.setItem("denken:readingSize", size);
      apply();
    });
    b.dataset.size = size;
    sizes.append(b);
  }
  const focus = check("演習中はメニューを隠す", localStorage.getItem("denken:focus") === "true");
  const setFocus = () => {
    document.body.dataset.studyFocus = String(focus.input.checked);
    localStorage.setItem("denken:focus", String(focus.input.checked));
  };
  focus.input.onchange = setFocus;
  setFocus();
  apply();
  controls.append(h("p", {}, "問題と解説の文字"), sizes, focus.field);
  controls.classList.add("study-reading-controls");
  return controls;
}

export function emptyState(title: string, text: string, action?: HTMLElement) {
  const wrap = h("div", { class: "study-empty" }, h("h3", {}, title), h("p", {}, text));
  if (action) wrap.append(action);
  return wrap;
}

export function stat(label: string, value: string, detail?: string) {
  return h(
    "div",
    { class: "study-stat" },
    h("dt", {}, label),
    h("dd", {}, value, ...(detail ? [h("p", {}, detail)] : [])),
  );
}
