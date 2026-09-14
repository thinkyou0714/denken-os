import { catalogue } from "./catalog.js";
import { api, saveRecord } from "./client.js";
import { area, button, h, notice, panel, select, table } from "./ui.js";

export function renderTutor(root: HTMLElement) {
  const wrap = panel(
    "考え方を確認する",
    "ヒント、確認済み解説、AIによる説明候補を区別します。参照する問題の条件をそろえて質問してください。",
  );
  const problem = select(
    "参照問題",
    catalogue.map((p) => `${p.id} ${p.topic}`),
  );
  const question = area("質問", "この問題で最初に確認すべき条件は？");
  const output = h("div", { "aria-live": "polite" });
  let level = 0;
  problem.input.onchange = () => {
    level = 0;
    output.replaceChildren();
  };
  const ask = async (reveal: boolean) => {
    const p = catalogue.find((p) => `${p.id} ${p.topic}` === problem.input.value);
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
    output.append(h("pre", { class: "lab-prose" }, result.answer));
    if (result.reference)
      output.append(h("h4", {}, "確認済み解説"), h("pre", { class: "lab-prose" }, result.reference));
    output.append(
      table(
        ["根拠ID", "参照元"],
        result.sources.map((s) => [s.id, s.citation]),
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
  };
  wrap.append(
    problem.field,
    question.field,
    button("次のヒント", () => ask(false), true),
    button("解説を確認", () => ask(true)),
    output,
  );
  root.append(wrap);
}
