/**
 * ui/dom.ts — 軽量 DOM ヘルパー。
 * h() で要素を宣言的に組み立て、$(id) でルックアップする。
 * これ以外の DOM 操作は各 views/* に直接記述する。
 */

export type Children = (Node | string)[];
export type Attrs = Record<string, string | number | boolean | ((e: Event) => void)>;

export function h(tag: string, attrs: Attrs = {}, ...children: Children): HTMLElement {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k.startsWith("on") && typeof v === "function") e.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
    else if (k === "class") e.className = String(v);
    else if (k === "html") e.innerHTML = String(v);
    else if (typeof v === "boolean") {
      if (v) e.setAttribute(k, "");
    } else e.setAttribute(k, String(v));
  }
  for (const c of children) e.append(c);
  return e;
}

export const $ = (id: string): HTMLElement => document.getElementById(id) as HTMLElement;
