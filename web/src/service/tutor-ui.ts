import { formatMath } from "../mathfmt.js";
import { safeHtml } from "../ui/dom.js";
import { catalogue } from "./catalog.js";
import { api, saveRecord } from "./client.js";
import { disclosure, focusHeading } from "./study-ui.js";
import { area, button, h, notice, panel, select, table } from "./ui.js";

export function renderTutor(root: HTMLElement) {
  const wrap = panel("解き方で迷ったら", "問題を選んで、どこでつまずいたかを書いてみましょう。");
  const problem = select(
    "参照問題",
    catalogue.map((p) => `${p.subject} · ${p.topic} · ${p.id}`),
  );
  const question = area("確認したいこと", "この問題で最初に確認すべき条件は？");
  const prompts = h("div", { class: "lab-actions" });
  for (const text of ["どの式から始める？", "単位をどうそろえる？", "この式の成立条件は？"])
    prompts.append(
      button(text, () => {
        question.input.value = text;
        question.input.focus();
      }),
    );
  const output = h("div", { "aria-live": "polite" });
  let level = 0;
  problem.input.onchange = () => {
    level = 0;
    output.replaceChildren();
  };
  const ask = async (reveal: boolean) => {
    const p = catalogue.find((p) => `${p.subject} · ${p.topic} · ${p.id}` === problem.input.value);
    const result = await api<{
      mode: string;
      answer: string;
      held: boolean;
      reference?: string;
      sources: { id: string; citation: string }[];
      calculations?: { expression: string; result: number }[];
    }>("tutor", "POST", {
      question: question.input.value,
      problemId: p?.id,
      revision: p?.revision,
      level: level++,
      reveal,
    });
    output.replaceChildren();
    notice(
      output,
      result.mode === "ai-suggestion"
        ? "AIの説明候補です。文章の意味全体は自動で保証できないため、下の確認済み解説と照合してください。"
        : result.held
          ? "確認を保留しています"
          : result.mode === "hint"
            ? "考え方のヒント"
            : "確認済みの参照情報",
    );
    const heading = h("h4", {}, "考え方を確認する");
    output.prepend(heading);
    output.append(h("div", { class: "lab-prose study-statement", html: safeHtml(formatMath(result.answer)) }));
    if (result.reference)
      output.append(
        h("h4", {}, "確認済み解説"),
        h("div", { class: "lab-prose study-statement", html: safeHtml(formatMath(result.reference)) }),
      );
    output.append(
      disclosure(
        "出典を確認する",
        table(
          ["根拠ID", "参照元"],
          result.sources.map((s) => [s.id, s.citation]),
        ),
      ),
    );
    if (result.calculations?.length)
      output.append(
        table(
          ["再計算した式", "結果"],
          result.calculations.map((c) => [c.expression, c.result]),
        ),
      );
    output.append(
      button("解決しなかった質問を残す", async () => {
        await saveRecord("support", crypto.randomUUID(), {
          problemId: p?.id,
          revision: p?.revision,
          question: question.input.value,
          response: result.answer,
          status: "waiting",
          shareWithReviewer: true,
          createdAt: Date.now(),
        });
        notice(output, "監修者が確認する待ち一覧に保存しました");
      }),
    );
    if (output.isConnected) focusHeading(heading);
  };
  wrap.append(
    problem.field,
    question.field,
    prompts,
    button("次のヒント", () => ask(false), true),
    button("解説を確認", () => ask(true)),
    output,
  );
  root.append(wrap);
}
