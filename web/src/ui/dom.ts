/**
 * ui/dom.ts — 軽量 DOM ヘルパー。
 * h() で要素を宣言的に組み立て、$(id) でルックアップする。
 * これ以外の DOM 操作は各 views/* に直接記述する。
 *
 * 安全化（II-169/II-170）:
 * - SafeHtml: sanitize済みのHTML文字列のbranded type。h()のhtml属性はこの型のみ受け付ける。
 * - safeHtml(): 呼び出し元が「この文字列は安全」と明示するときに使う（SVGサニタイズ済み・formatMath等）。
 * - $req(): querySelector/getElementById の null 黙殺を防ぐガード付き取得ヘルパー。
 */

// SafeHtml / safeHtml は DOM 非依存のため safe-html.ts に分離（node 環境テストから import 可能にする）。
import { type SafeHtml, safeHtml } from "./safe-html.js";

export { type SafeHtml, safeHtml };

export type Children = (Node | string)[];
/** h() の attrs。html キーを渡す場合は safeHtml() でキャストした SafeHtml 型を使うこと（II-169 規約）。 */
export type Attrs = Record<string, string | number | boolean | SafeHtml | ((e: Event) => void)>;

export function h(tag: string, attrs: Attrs = {}, ...children: Children): HTMLElement {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k.startsWith("on") && typeof v === "function") e.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
    else if (k === "class") e.className = String(v);
    else if (k === "html") {
      // SafeHtml branded type のみ受け付ける（型レベル保証。II-169）。
      e.innerHTML = String(v);
    } else if (typeof v === "boolean") {
      if (v) e.setAttribute(k, "");
    } else e.setAttribute(k, String(v));
  }
  for (const c of children) e.append(c);
  return e;
}

export const $ = (id: string): HTMLElement => document.getElementById(id) as HTMLElement;

/**
 * ガード付き要素取得ヘルパー（II-170）。
 * querySelector の結果が null のとき Error を投げる（null 黙殺を防ぐ）。
 * per-viewエラー境界でキャッチされるため、白画面になる代わりにrecovery表示になる。
 * @param host 検索対象の親要素
 * @param sel CSSセレクタ
 */
export function $req<T extends Element = HTMLElement>(host: Element | Document, sel: string): T {
  const el = host.querySelector<T>(sel);
  if (!el) throw new Error(`[dom] 要素が見つかりません: "${sel}"`);
  return el;
}
