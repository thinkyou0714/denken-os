import { h } from "../ui/dom.js";

export { h };
export function notice(root: HTMLElement, message: string, error = false) {
  const el = h("p", { class: error ? "lab-message error" : "lab-message", role: error ? "alert" : "status" }, message);
  root.append(el);
  return el;
}
export function button(label: string, action: () => void | Promise<void>, primary = false) {
  const el = h("button", { type: "button", class: primary ? "primary" : "chip" }, label) as HTMLButtonElement;
  el.onclick = async () => {
    el.disabled = true;
    try {
      await action();
    } catch (error) {
      notice(
        (el.closest(".lab-panel") as HTMLElement) ?? el.parentElement ?? el,
        error instanceof Error ? error.message : "操作を完了できませんでした",
        true,
      );
    } finally {
      el.disabled = false;
    }
  };
  return el;
}
export function input(label: string, value = "", type = "text") {
  const el = h("input", { type, value, "aria-label": label }) as HTMLInputElement;
  return { input: el, field: h("label", { class: "lab-field" }, h("span", {}, label), el) };
}
export function area(label: string, value = "", rows = 4) {
  const el = h("textarea", { rows: String(rows), "aria-label": label }) as HTMLTextAreaElement;
  el.value = value;
  return { input: el, field: h("label", { class: "lab-field" }, h("span", {}, label), el) };
}
export function select(label: string, choices: readonly string[], value?: string) {
  const el = h(
    "select",
    { "aria-label": label },
    ...choices.map((v) => h("option", { value: v }, v)),
  ) as HTMLSelectElement;
  if (value !== undefined) el.value = value;
  return { input: el, field: h("label", { class: "lab-field" }, h("span", {}, label), el) };
}
export function check(label: string, checked = false) {
  const el = h("input", { type: "checkbox" }) as HTMLInputElement;
  el.checked = checked;
  return { input: el, field: h("label", { class: "lab-check" }, el, h("span", {}, label)) };
}
export function panel(title: string, description?: string) {
  const el = h("section", { class: "lab-panel" }, h("h3", {}, title));
  if (description) el.append(h("p", { class: "muted" }, description));
  return el;
}
export function table(headers: string[], rows: (string | number | null)[][]) {
  return h(
    "div",
    { class: "lab-table" },
    h(
      "table",
      {},
      h("thead", {}, h("tr", {}, ...headers.map((t) => h("th", { scope: "col" }, t)))),
      h(
        "tbody",
        {},
        ...rows.map((row) =>
          h("tr", {}, ...row.map((value) => h("td", {}, value === null ? "記録なし" : String(value)))),
        ),
      ),
    ),
  );
}
export function link(text: string, url: string) {
  return h("a", { href: url, target: "_blank", rel: "noopener noreferrer" }, text);
}
export function percent(value: number | null) {
  return value === null ? "記録なし" : `${Math.round(value * 100)}%`;
}
