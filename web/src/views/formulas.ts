/**
 * views/formulas.ts — 公式タブの描画。
 */
import { FORMULAS, filterFormulas } from "../formulas.js";
import { formatMath } from "../mathfmt.js";
import { h } from "../ui/dom.js";
import { emptyState } from "../ui/widgets.js";

/** 公式タブの検索クエリ（タブ滞在中は保持）。 */
let formulasQuery = "";

function renderFormulaList(host: HTMLElement): void {
  host.innerHTML = "";
  const groups = filterFormulas(FORMULAS, formulasQuery);
  if (groups.length === 0) {
    host.append(emptyState("🔍", "見つかりませんでした", "別のキーワードでお試しください（例: 力率 / %Z / すべり）。"));
    return;
  }
  for (const group of groups) {
    const table = h("table", { class: "fx" });
    for (const item of group.items) {
      table.append(
        h(
          "tr",
          {},
          h("td", {}, item.name),
          h(
            "td",
            {},
            h("span", { html: formatMath(item.formula) }),
            item.note ? h("div", { class: "muted" }, item.note) : "",
          ),
        ),
      );
    }
    host.append(h("h2", {}, group.subject), table);
  }
}

export function renderFormulas(root: HTMLElement): void {
  root.append(
    h("h2", {}, "公式集"),
    h("p", { class: "muted" }, "暗記だけでなく導出の足がかりに。出題テンプレートと対応しています。"),
  );
  // 検索: 56件の公式を目視スキャンさせない（部分一致・入力フォーカスを保ったままリストのみ更新）。
  const list = h("div", { id: "fxlist" });
  const search = h("input", {
    type: "search",
    class: "num",
    placeholder: "公式を検索（例: 力率 / %Z / たるみ）",
    "aria-label": "公式を検索",
    value: formulasQuery,
  }) as HTMLInputElement;
  search.addEventListener("input", () => {
    formulasQuery = search.value;
    renderFormulaList(list);
  });
  root.append(search, list);
  renderFormulaList(list);
}
