import { type Attempt, CAUSES } from "../../../lib/service/assessment.js";
import { gradeQuantity, inspectSteps } from "../../../lib/service/quantities.js";
import { PREREQUISITES, portableContext, SKILLS } from "../../../lib/service/study-tools.js";
import { isAnswerCorrect } from "../grade.js";
import { formatMath } from "../mathfmt.js";
import { progress } from "../state/app.js";
import { safeHtml } from "../ui/dom.js";
import { solutionNode } from "../ui/widgets.js";
import { type CatalogueProblem, catalogue } from "./catalog.js";
import { allAttempts, download, saveRecord } from "./client.js";
import { saveAttempt } from "./events.js";
import { area, button, check, h, input, notice, panel, select, table } from "./ui.js";

export async function renderLearning(root: HTMLElement) {
  const attempts = (await allAttempts()).items;
  const settings = panel("自力演習を選ぶ");
  const mode = select("練習の目的", ["自力演習", "復習", "未見候補テスト", "説明練習"]);
  const subject = select("科目", ["すべて", ...new Set(catalogue.map((p) => p.subject))]);
  const skill = select("確認する技能", SKILLS, "式の選択");
  const mix = check("慣れた分野は関連する論点を混ぜる");
  const chooser = select("問題", []);
  const work = h("div", {});
  const refresh = () => {
    let candidates = catalogue.filter((p) => subject.input.value === "すべて" || p.subject === subject.input.value);
    if (mode.input.value === "未見候補テスト")
      candidates = candidates.filter((p) => !attempts.some((a) => a.family === p.family || a.problemId === p.id));
    if (mode.input.value === "復習")
      candidates.sort(
        (a, b) =>
          Number(attempts.some((t) => t.problemId === b.id && !t.correct)) -
          Number(attempts.some((t) => t.problemId === a.id && !t.correct)),
      );
    if (mix.input.checked)
      candidates = candidates
        .map((p) => ({ p, sort: crypto.getRandomValues(new Uint32Array(1))[0] ?? 0 }))
        .sort((a, b) => a.sort - b.sort)
        .map((x) => x.p);
    chooser.input.replaceChildren(
      ...candidates.map((p) => h("option", { value: p.id }, `${p.subject}｜${p.topic}｜${p.id}`)),
    );
  };
  subject.input.onchange = refresh;
  mode.input.onchange = refresh;
  mix.input.onchange = refresh;
  refresh();
  settings.append(
    h("div", { class: "lab-grid" }, mode.field, subject.field, skill.field, chooser.field),
    mix.field,
    button(
      "この問題を開始",
      () => {
        const p = catalogue.find((p) => p.id === chooser.input.value);
        work.replaceChildren();
        if (!p) {
          notice(
            work,
            "条件に合う問題がありません。未見系列が不足する場合は、確認済みの別系列を追加する必要があります。",
          );
          return;
        }
        renderQuestion(work, p, skill.input.value, mode.input.value, attempts);
      },
      true,
    ),
  );
  root.append(settings, work);
}

export function renderQuestion(
  root: HTMLElement,
  p: CatalogueProblem,
  skill: string,
  modeName: string,
  history: Attempt[],
) {
  const startedAt = Date.now();
  let hints = 0,
    revealed = false,
    given = "",
    submitted = false;
  const mode: Attempt["mode"] = modeName === "未見候補テスト" ? "holdout" : modeName === "復習" ? "review" : "practice";
  const wrap = panel(p.topic),
    unseen = check("この問題と同じ解法の系列を、以前に学習していない");
  wrap.append(
    h("p", { class: "lab-meta" }, `${p.subject} ／ ${p.id} ／ ${skill}`),
    h("div", { class: "statement", html: safeHtml(formatMath(p.statement)) }),
  );
  if (p.figure) wrap.append(h("div", { class: "figure", html: safeHtml(p.figure) }));
  if (mode === "holdout") wrap.append(unseen.field);
  const work = h("div", { class: "lab-answer-area" });
  const answer = area(
    p.format === "descriptive" ? "自分の答案・説明" : "自分の答え",
    "",
    p.format === "descriptive" ? 6 : 2,
  );
  if (p.format === "multiple_choice" && p.choices) {
    for (const choice of p.choices) {
      const b = button(choice, () => {
        given = choice;
        answer.input.value = choice;
        for (const other of work.querySelectorAll("button")) other.setAttribute("aria-pressed", String(other === b));
      });
      b.setAttribute("aria-pressed", "false");
      work.append(b);
    }
  }
  work.append(answer.field);
  const why = area("この式を選んだ理由・成立条件（任意）", "", 2);
  const estimate = input("答えの桁・上限下限の予想（任意）");
  const cause = select("つまずきの原因", CAUSES);
  const scaffold = check("答案の骨組みを表示する");
  const scaffolding = h("div", { class: "lab-scaffold" });
  scaffold.input.onchange = () => {
    scaffolding.replaceChildren();
    if (scaffold.input.checked) {
      hints++;
    }
    if (scaffold.input.checked)
      scaffolding.append(
        h(
          "ol",
          {},
          h("li", {}, "条件と、求める量を整理する"),
          h("li", {}, "使う式と、適用できる理由を書く"),
          h("li", {}, "単位をそろえて代入する"),
          h("li", {}, "結論に単位を付け、概算・逆算する"),
        ),
      );
  };
  const hintBox = h("div", { class: "lab-hints" });
  const hint = button("考え方のヒントを一つ", () => {
    if (mode === "holdout") {
      notice(hintBox, "未見候補テストでは支援を使いません。練習へ切り替えて利用してください。");
      return;
    }
    const max = Math.max(0, p.solution.length - 1);
    if (hints >= max) {
      notice(hintBox, "ここまでの式から自分で計算してみてください。必要なら解説全体を開けます。");
      return;
    }
    hints++;
    hintBox.append(h("p", {}, `ヒント${hints}：${p.solution[hints - 1]}`));
  });
  const reveal = button("解説を確認する", () => {
    revealed = true;
    hintBox.replaceChildren(solutionNode(p, "確認済み解説"));
  });
  const result = h("div", {}),
    actions = h("div", { class: "lab-actions" });
  const submit = button(
    p.format === "descriptive" ? "答案を保存して確認" : "回答して確認",
    async () => {
      if (submitted) return;
      given = answer.input.value.trim();
      if (!given) {
        notice(result, "回答を入力してください", true);
        return;
      }
      if (mode === "holdout" && (!unseen.input.checked || revealed)) {
        notice(result, "未見・無支援の条件を満たしません。練習として保存するか、別の未見候補を選んでください。", true);
        return;
      }
      const correct =
        p.format === "descriptive"
          ? null
          : p.format === "numeric"
            ? gradeQuantity(
                given,
                p.answer,
                p.grading ?? { unit: "", absolute: 1e-9, relative: 0.005, requireUnit: false, accepted: [] },
              ).correct
            : isAnswerCorrect(p, given);
      const attempt: Attempt = {
        id: crypto.randomUUID(),
        problemId: p.id,
        revision: p.revision,
        topic: p.topic,
        subject: p.subject,
        family: p.family,
        skill,
        answer: given,
        correct,
        score: correct === null ? null : correct ? 1 : 0,
        hints,
        revealed,
        mode,
        startedAt,
        finishedAt: Date.now(),
        cause: cause.input.value as Attempt["cause"],
        graderVersion: "service-1",
      };
      try {
        await saveAttempt(attempt);
        notice(result, "答案を端末に記録しました。同期状況は画面上部で確認できます。");
      } catch {
        notice(result, "答案を端末の保存待ちに残しました。接続後に再送します。");
      }
      progress.record(
        p.topic,
        correct && !hints && !revealed ? "good" : "again",
        Date.now(),
        Date.now() - startedAt,
        p.id,
        given,
      );
      submitted = true;
      answer.input.readOnly = true;
      history.push(attempt);
      result.append(
        h(
          "h4",
          {},
          correct === null
            ? "記述答案は観点別に確認します"
            : correct
              ? "正答と一致しました"
              : "正答と照合して復習しましょう",
        ),
        solutionNode(p, "解説"),
      );
      if (p.format === "descriptive")
        result.append(
          table(
            ["行", "数値式の確認", "結果"],
            inspectSteps(given).map((row) => [row.line, row.status, row.reason]),
          ),
          h(
            "p",
            { class: "muted" },
            "数値式の一致だけで、電気的な前提や論説の正しさは判定しません。解釈できない式は保留です。",
          ),
        );
      if (p.choices) {
        result.append(
          h("h4", {}, "各選択肢の確認"),
          table(
            ["選択肢", "照合", "自分で確認する点"],
            p.choices.map((choice) => [
              choice,
              choice === p.answer ? "正答" : "不一致",
              choice === p.answer ? "解説の前提・単位を確認" : distractorReason(choice, p.answer),
            ]),
          ),
        );
      }
      const next = PREREQUISITES[cause.input.value] ?? ["問題の条件", "使う式", "単位と検算"];
      result.append(
        h("h4", {}, "戻って確認する前提"),
        h("ul", {}, ...next.map((v) => h("li", {}, v))),
        button("間違いノートへ残す", async () => {
          await saveRecord("note", crypto.randomUUID(), {
            problemId: p.id,
            revision: p.revision,
            topic: p.topic,
            answer: given,
            cause: cause.input.value,
            reason: why.input.value,
            estimate: estimate.input.value,
            text: "",
            createdAt: Date.now(),
          });
          notice(result, "版付きのノートを保存しました");
        }),
        button("人による確認を依頼欄に残す", async () => {
          await saveRecord("support", crypto.randomUUID(), {
            problemId: p.id,
            revision: p.revision,
            question: given,
            context: why.input.value,
            status: "waiting",
            createdAt: Date.now(),
            shareWithReviewer: true,
          });
          notice(result, "確認待ちに登録しました。対応時間は未設定です。");
        }),
      );
    },
    true,
  );
  if (mode === "holdout") {
    hint.disabled = true;
    reveal.disabled = true;
    scaffold.input.disabled = true;
  }
  actions.append(hint, reveal, submit);
  const exportContext = () =>
    portableContext({
      problemId: p.id,
      revision: p.revision,
      statement: p.statement,
      answer: answer.input.value,
      hints,
      source: p.source.citation ?? "DENKEN-OS独自教材",
    });
  const exportButton = button("ノート・別のAIへ引き継ぐ", () =>
    download(`DENKEN-${p.id}.md`, exportContext(), "text/markdown"),
  );
  wrap.append(
    work,
    why.field,
    estimate.field,
    cause.field,
    scaffold.field,
    scaffolding,
    actions,
    hintBox,
    result,
    exportButton,
    h(
      "p",
      { class: "muted" },
      `出典：${p.source.citation ?? "DENKEN-OS独自教材"} ／ 問題版 ${p.revision.slice(0, 12)}`,
    ),
  );
  root.append(wrap);
}

function distractorReason(choice: string, answer: string): string {
  const get = (value: string) => Number(value.normalize("NFKC").match(/[-+]?\d+(?:\.\d+)?/)?.[0]);
  const given = get(choice),
    correct = get(answer);
  if (!Number.isFinite(given) || !Number.isFinite(correct) || !correct)
    return "式を適用する条件・単位・選択肢の内容を解説と比較";
  const ratio = given / correct;
  const factors: [[number, string], [number, string], [number, string], [number, string], [number, string]] = [
    [1000, "k/Mなどの接頭語"],
    [0.001, "k/Mなどの接頭語"],
    [3, "三相と一相の区別"],
    [Math.sqrt(3), "線間量と相量の区別"],
    [2, "最大値・実効値や係数の条件"],
  ];
  const found = factors.find(([factor]) => Math.abs(ratio - factor) < factor * 0.02);
  return found ? `確認する原因候補：${found[1]}（原因の断定ではありません）` : "代入する量、単位、桁を解説と比較";
}
