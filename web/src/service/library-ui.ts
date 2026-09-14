import type { Paper } from "../../../lib/service/assessment.js";
import { catalogue, libraryManifest, loadExperimentalSubject } from "./catalog.js";
import { api, download } from "./client.js";
import { renderQuestion } from "./learning-ui.js";
import { button, h, input, link, notice, panel, select, table } from "./ui.js";

export async function renderLibrary(root: HTMLElement) {
  const wrap = panel("教材を探す", "通常学習の教材と、未監修の生成問題を区別して検索します。");
  const query = input("論点・出典・問題番号・年度を検索");
  const subject = select("科目", ["すべて", ...new Set(catalogue.map((p) => p.subject))]);
  const mode = select("確認状態", ["通常学習の教材", "生成問題の検証用"]);
  const list = h("div", {}),
    detail = h("div", {});
  let pool = catalogue;
  const render = () => {
    const q = query.input.value.toLocaleLowerCase();
    const rows = pool.filter(
      (p) =>
        (subject.input.value === "すべて" || p.subject === subject.input.value) &&
        `${p.id} ${p.topic} ${p.statement} ${p.source.citation ?? ""}`.toLocaleLowerCase().includes(q),
    );
    list.replaceChildren();
    notice(list, `${rows.length}件。先頭100件を表示しています。`);
    for (const p of rows.slice(0, 100))
      list.append(
        button(`${p.id}｜${p.subject}｜${p.topic}`, () => {
          detail.replaceChildren();
          if (mode.input.value === "通常学習の教材") {
            renderQuestion(detail, p, "応用", "自力演習", []);
            return;
          }
          const preview = panel(p.topic, "未監修の生成問題です。通常学習の成績には含めません。");
          preview.append(
            h("p", {}, p.statement),
            h("p", {}, `回答候補：${p.answer}`),
            h("ol", {}, ...p.solution.map((s) => h("li", {}, s))),
            button("監修用データを書き出す", () => download(`DENKEN-draft-${p.id}.json`, JSON.stringify(p, null, 2))),
          );
          detail.append(preview);
        }),
      );
  };
  query.input.oninput = render;
  const load = async () => {
    if (mode.input.value === "生成問題の検証用") {
      if (subject.input.value === "すべて") subject.input.value = "理論";
      pool = await loadExperimentalSubject(subject.input.value);
    } else pool = catalogue;
    render();
  };
  subject.input.onchange = () => {
    void load().catch((e) => notice(list, e instanceof Error ? e.message : "取得できません", true));
  };
  mode.input.onchange = () => {
    void load().catch((e) => notice(list, e instanceof Error ? e.message : "取得できません", true));
  };
  wrap.append(h("div", { class: "lab-grid" }, query.field, subject.field, mode.field), list);
  root.append(wrap, detail);
  render();
  const coverage = panel(
    "収録範囲の確認",
    "教材を収録した範囲と、本人が習得した範囲は別です。生成問題数から過去問全問の網羅を判断しません。",
  );
  const { papers } = await api<{ papers: Paper[] }>("catalog");
  coverage.append(
    table(
      ["科目", "通常学習の問題数", "公式原典を構造化した年度"],
      [...new Set(catalogue.map((p) => p.subject))].map((s) => [
        s,
        catalogue.filter((p) => p.subject === s).length,
        papers
          .filter((p) => p.subject === s)
          .map((p) => p.source.year)
          .join("、") || "未収録",
      ]),
    ),
  );
  coverage.append(
    h(
      "p",
      { class: "muted" },
      `既存生成問題 ${libraryManifest?.experimental.total ?? 0}件は別枠です。未収録の年度・論点は公式原典との対応確認が必要です。`,
    ),
  );
  root.append(coverage);
  const resources = panel("原典と補助教材");
  resources.append(
    h(
      "ul",
      {},
      h("li", {}, link("公式過去問と利用条件", "https://www.shiken.or.jp/chief/second/qa/")),
      h("li", {}, link("試験概要・科目合格・免除制度", "https://www.shiken.or.jp/chief/second/overview/")),
      h("li", {}, link("電気の神髄：二種の年度・科目別索引", "https://denki-no-shinzui.com/denken-database/denken2/")),
      h("li", {}, link("SAT：二種講座の案内", "https://www.sat-co.info/ec/denken2")),
      h("li", {}, link("電験王：主に三種の隣接教材", "https://denken-ou.com/")),
    ),
  );
  root.append(resources);
  const offline = panel(
    "オフライン教材",
    "通常学習の教材は取得時に版を照合します。検証用の科目は選んだものだけ取得します。APIから取得する個人記録を教材キャッシュへ保存しません。",
  );
  offline.append(
    button("選択科目の検証用教材を保存", async () => {
      const name = subject.input.value === "すべて" ? "理論" : subject.input.value;
      const rows = await loadExperimentalSubject(name);
      const shard = libraryManifest?.experimental.shards.find((s) => s.subject === name);
      if (!shard) throw new Error("教材が見つかりません");
      if (!("caches" in window)) throw new Error("このブラウザでは教材キャッシュを利用できません");
      const cache = await caches.open("denken-study-downloads");
      // Re-fetch original bytes, independently check the digest, then cache atomically.
      const response = await fetch(`./problems/${shard.file}`);
      const bytes = await response.arrayBuffer();
      const hash = [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))]
        .map((n) => n.toString(16).padStart(2, "0"))
        .join("");
      if (hash !== shard.sha256) throw new Error("教材版が変わりました。再読み込みしてください");
      await cache.put(
        new URL(`./problems/${shard.file}`, location.href).href,
        new Response(bytes, { headers: { "content-type": "application/json" } }),
      );
      notice(offline, `${name} ${rows.length}件を保存しました`);
    }),
    button("追加保存した教材キャッシュを削除", async () => {
      await caches.delete("denken-study-downloads");
      notice(offline, "追加教材を削除しました。学習記録は保持しています。");
    }),
  );
  root.append(offline);
}
