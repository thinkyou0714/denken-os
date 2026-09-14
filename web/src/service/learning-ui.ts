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
import { identity } from "./cloud-storage.js";
import { saveAttempt } from "./events.js";
import { disclosure, focusHeading, stat } from "./study-ui.js";
import { area, button, check, h, input, notice, panel, select, table } from "./ui.js";

export interface LearningOptions {
  ids?: string[];
  subject?: string;
  mode?: string;
  autoStart?: boolean;
  onExit?: () => void;
}
const MODES = ["自力演習", "復習", "未見候補テスト", "説明練習"];
const MODE_LABELS: Record<string, string> = {
  自力演習: "一問ずつ学ぶ",
  復習: "解き直す",
  未見候補テスト: "初めての問題で確認",
  説明練習: "説明して理解する",
};

export async function renderLearning(root: HTMLElement, options: LearningOptions = {}) {
  const attempts = (await allAttempts()).items;
  const setup = panel("どの問題を解きますか？");
  const mode = select("練習の目的", MODES, options.mode ?? "自力演習");
  for (const option of mode.input.options) option.textContent = MODE_LABELS[option.value] ?? option.value;
  const subject = select("科目", ["すべて", ...new Set(catalogue.map((p) => p.subject))], options.subject ?? "すべて");
  const skill = select("確認する技能", SKILLS, "式の選択");
  const mix = check("関連する論点を混ぜて出題する");
  const chooser = select("最初の問題", []);
  const count = select("一度に学ぶ問題数", ["1", "3", "5"], "5");
  let candidates: CatalogueProblem[] = [];
  const availability = h("p", { class: "muted", role: "status" });
  const work = h("div", { class: "study-session" });
  const refresh = () => {
    candidates = catalogue.filter((p) => subject.input.value === "すべて" || p.subject === subject.input.value);
    if (mode.input.value === "未見候補テスト")
      candidates = candidates.filter((p) => !attempts.some((a) => a.family === p.family || a.problemId === p.id));
    if (mode.input.value === "復習") {
      const latest = new Map<string, Attempt>();
      for (const a of [...attempts].sort((a, b) => b.finishedAt - a.finishedAt))
        if (!latest.has(a.problemId)) latest.set(a.problemId, a);
      candidates.sort(
        (a, b) => Number(latest.get(b.id)?.correct === false) - Number(latest.get(a.id)?.correct === false),
      );
    }
    if (mix.input.checked)
      candidates = candidates
        .map((p) => ({ p, sort: crypto.getRandomValues(new Uint32Array(1))[0] ?? 0 }))
        .sort((a, b) => a.sort - b.sort)
        .map((v) => v.p);
    chooser.input.replaceChildren(
      ...candidates.map((p, i) =>
        h(
          "option",
          { value: p.id },
          `${i + 1}. ${p.topic} · ${p.format === "descriptive" ? "記述" : p.format === "numeric" ? "計算" : "選択"}`,
        ),
      ),
    );
    availability.textContent = `${candidates.length}問から選べます。${mode.input.value === "未見候補テスト" ? "このモードではヒントを使わずに回答します。" : "回答すると、その場で解説を確認できます。"}`;
  };
  subject.input.onchange = refresh;
  mode.input.onchange = refresh;
  mix.input.onchange = refresh;
  refresh();
  const startSession = (queue: CatalogueProblem[]) => {
    if (!queue.length) {
      notice(setup, "条件に合う問題がありません。科目や練習の目的を変えてください。", true);
      return;
    }
    setup.hidden = true;
    const outcomes: Attempt[] = [];
    let index = 0;
    const end = () => {
      document.body.dataset.studyActive = "false";
      work.replaceChildren();
      const result = panel("今回の学習を振り返る");
      result.classList.add("study-session-complete");
      const scored = outcomes.filter((a) => a.correct !== null);
      result.append(
        h(
          "dl",
          { class: "study-stats" },
          stat("回答した問題", `${outcomes.length}問`),
          stat("正答", `${scored.filter((a) => a.correct).length} / ${scored.length}問`),
          stat("ヒントなし", `${outcomes.filter((a) => a.hints === 0 && !a.revealed).length}問`),
        ),
      );
      const retry = outcomes.filter((a) => a.correct === false || a.hints > 0 || a.revealed);
      if (retry.length) result.append(h("p", {}, `${retry.length}問は、時間を空けてもう一度確認しましょう。`));
      else result.append(h("p", {}, "おつかれさまでした。次は復習の時期に合わせて確認しましょう。"));
      if (outcomes.some((a) => a.correct === null))
        result.append(h("p", { class: "muted" }, "記述問題は自動で正誤を決めず、答案を保存しています。"));
      result.append(
        button("今日の学習へ戻る", () => (options.onExit ? options.onExit() : reset()), true),
        button("別の問題を選ぶ", reset),
      );
      work.append(result);
      if (work.isConnected) focusHeading(result.querySelector("h3"));
    };
    const reset = () => {
      document.body.dataset.studyActive = "false";
      setup.hidden = false;
      work.replaceChildren();
      refresh();
      focusHeading(setup.querySelector("h3"));
    };
    const next = () => {
      if (index >= queue.length) {
        end();
        return;
      }
      work.replaceChildren();
      const bar = h(
        "div",
        { class: "study-session-bar" },
        button("問題選択へ戻る", reset),
        h("span", {}, `${index + 1} / ${queue.length} 問`),
        h("span", { class: "study-mode-label" }, MODE_LABELS[mode.input.value] ?? mode.input.value),
      );
      const meter = h("progress", {
        class: "study-progress",
        value: String(index),
        max: String(queue.length),
        "aria-label": "今回の学習の進み具合",
      });
      const question = h("div", {});
      work.append(bar, meter, question);
      const currentProblem = queue[index];
      if (!currentProblem) {
        end();
        return;
      }
      renderQuestion(question, currentProblem, skill.input.value, mode.input.value, attempts, {
        onComplete: (attempt) => {
          outcomes.push(attempt);
        },
        onNext: () => {
          index++;
          next();
        },
        nextLabel: index === queue.length - 1 ? "学習のまとめを見る" : "次の問題へ",
      });
      if (work.isConnected) focusHeading(question.querySelector("h3"));
    };
    next();
  };
  setup.append(
    h("div", { class: "lab-grid" }, subject.field, mode.field),
    chooser.field,
    disclosure("出題条件を詳しく選ぶ", h("div", { class: "lab-grid" }, count.field, skill.field), mix.field),
    availability,
    button(
      "学習を始める",
      () => {
        const chosen = candidates.find((p) => p.id === chooser.input.value);
        startSession(
          chosen ? [chosen, ...candidates.filter((p) => p.id !== chosen.id)].slice(0, Number(count.input.value)) : [],
        );
      },
      true,
    ),
  );
  root.append(setup, work);
  if (options.autoStart && options.ids?.length)
    startSession(options.ids.map((id) => catalogue.find((p) => p.id === id)).filter((p): p is CatalogueProblem => !!p));
}

interface QuestionActions {
  onComplete?: (attempt: Attempt) => void;
  onNext?: () => void;
  nextLabel?: string;
}
interface Draft {
  answer: string;
  hints: number;
  revealed: boolean;
  why: string;
  estimate: string;
  cause: string;
  startedAt: number;
}

export function renderQuestion(
  root: HTMLElement,
  p: CatalogueProblem,
  skill: string,
  modeName: string,
  history: Attempt[],
  options: QuestionActions = {},
) {
  const mode: Attempt["mode"] = modeName === "未見候補テスト" ? "holdout" : modeName === "復習" ? "review" : "practice";
  const draftKey = identity ? `denken:studyDraft:${identity.id}:${p.id}:${p.revision}:${mode}` : null;
  let draft: Draft | null = null;
  if (draftKey) {
    try {
      draft = JSON.parse(sessionStorage.getItem(draftKey) ?? "null") as Draft | null;
    } catch {
      /* A malformed tab-local draft must not block study. */
    }
  }
  let startedAt = typeof draft?.startedAt === "number" && draft.startedAt <= Date.now() ? draft.startedAt : Date.now();
  if (Date.now() - startedAt > 24 * 3600000) startedAt = Date.now();
  let hints =
    typeof draft?.hints === "number" && Number.isFinite(draft.hints) ? Math.max(0, Math.min(100, draft.hints)) : 0;
  let revealed = draft?.revealed === true,
    submitted = false;
  const wrap = panel(p.topic);
  wrap.classList.add("study-question-workspace");
  wrap.dataset.questionActive = "true";
  if (root.isConnected) document.body.dataset.studyActive = "true";
  const question = h(
    "section",
    { class: "study-question-stem", "aria-label": "問題文" },
    h(
      "p",
      { class: "study-question-meta" },
      `${p.subject} · ${p.format === "descriptive" ? "記述問題" : p.format === "numeric" ? "計算問題" : "選択問題"}`,
    ),
    h("div", { class: "statement study-statement", html: safeHtml(formatMath(p.statement)) }),
  );
  if (p.figure) question.append(h("div", { class: "figure study-figure", html: safeHtml(p.figure) }));
  const why = area("この式を選んだ理由・成立条件", typeof draft?.why === "string" ? draft.why : "", 3);
  const estimate = input("答えの桁・上限下限の予想", typeof draft?.estimate === "string" ? draft.estimate : "");
  const cause = select("つまずきの原因", CAUSES, typeof draft?.cause === "string" ? draft.cause : "不明");
  question.append(disclosure("考えたことをメモする（任意）", why.field, estimate.field, cause.field));
  question.append(
    disclosure(
      "出典・問題情報",
      h("p", {}, p.source.citation ?? "DENKEN-OS独自教材"),
      h("p", { class: "lab-meta" }, `${p.id} · ${p.revision.slice(0, 12)} · ${skill}`),
    ),
  );
  const work = h("section", { class: "study-answer-pane", "aria-label": "回答と解説" });
  const answer = area(
    p.format === "descriptive" ? "自分の答案・説明" : "自分の答え",
    typeof draft?.answer === "string" ? draft.answer : "",
    p.format === "descriptive" ? 8 : 2,
  );
  const saveDraft = () => {
    if (!draftKey || submitted) return;
    try {
      sessionStorage.setItem(
        draftKey,
        JSON.stringify({
          answer: answer.input.value,
          hints,
          revealed,
          why: why.input.value,
          estimate: estimate.input.value,
          cause: cause.input.value,
          startedAt,
        }),
      );
    } catch {
      /* Explicit submit remains available if tab storage is full. */
    }
  };
  for (const field of [answer.input, why.input, estimate.input, cause.input])
    field.addEventListener("input", saveDraft);
  const answerControls = h("div", { class: "study-answer-controls" });
  answerControls.append(h("h4", {}, p.format === "multiple_choice" ? "答えを一つ選ぶ" : "自分の答えを書く"));
  const radios: HTMLInputElement[] = [];
  if (p.format === "multiple_choice" && p.choices) {
    const choices = h("fieldset", { class: "study-choices" }, h("legend", { class: "sr-only" }, "回答の選択肢"));
    for (const [i, choice] of p.choices.entries()) {
      const radio = h("input", { type: "radio", name: `answer-${p.id}`, value: choice }) as HTMLInputElement;
      radio.checked = answer.input.value === choice;
      radio.onchange = () => {
        if (!submitted) {
          answer.input.value = choice;
          saveDraft();
        }
      };
      radios.push(radio);
      choices.append(
        h(
          "label",
          { class: "study-choice" },
          radio,
          h("span", { class: "study-choice-key", "aria-hidden": "true" }, String(i + 1)),
          h("span", { html: safeHtml(formatMath(choice)) }),
        ),
      );
    }
    answerControls.append(choices);
  } else {
    answer.input.placeholder =
      p.format === "descriptive" ? "使う式 → 代入 → 計算 → 結論の順に書いてみましょう。" : "数値と、必要な単位を入力";
    answerControls.append(answer.field);
    if (p.format === "numeric")
      answerControls.append(
        h(
          "p",
          { class: "lab-meta" },
          p.grading?.requireUnit
            ? `単位「${p.grading.unit}」を付けて回答してください。`
            : "半角・全角の数値で回答できます。",
        ),
      );
  }
  const unseen = check("この問題と同じ解法の問題を、以前に学習していない");
  if (mode === "holdout") answerControls.append(unseen.field);
  const result = h("div", { class: "study-result" });
  const hintBox = h("div", { class: "lab-hints", "aria-live": "polite" });
  let stepHints = 0;
  const hint = button("考え方のヒント", () => {
    const max = Math.max(0, p.solution.length - 1);
    if (stepHints >= max) {
      notice(hintBox, "ここまでの式から計算してみましょう。解説全体を開くこともできます。");
      return;
    }
    hints = Math.min(100, hints + 1);
    const text = p.solution[stepHints++] ?? "";
    saveDraft();
    hintBox.append(h("div", { class: "study-hint", html: safeHtml(formatMath(text)) }));
  });
  const scaffold = check("答案の組み立て方を見る");
  const scaffoldBody = h("div", {});
  scaffold.input.onchange = () => {
    scaffoldBody.replaceChildren();
    if (scaffold.input.checked) {
      hints = Math.min(100, hints + 1);
      saveDraft();
      scaffoldBody.append(
        h(
          "ol",
          {},
          ...[
            "条件と求める量を整理する",
            "使う式と理由を書く",
            "単位をそろえて代入する",
            "結論に単位を付けて検算する",
          ].map((text) => h("li", {}, text)),
        ),
      );
    }
  };
  const reveal = button("解説を見てから学ぶ", () => {
    revealed = true;
    saveDraft();
    hintBox.replaceChildren(
      h("p", { class: "lab-meta" }, "解説を見た回答として記録します。"),
      solutionNode(p, "確認済み解説"),
    );
  });
  const help = disclosure(
    "解けないときのサポート",
    h("div", { class: "lab-actions" }, hint, reveal),
    scaffold.field,
    scaffoldBody,
    hintBox,
  );
  if (mode === "holdout") {
    hint.disabled = true;
    reveal.disabled = true;
    scaffold.input.disabled = true;
    help.hidden = true;
  }
  const submit = button(
    p.format === "descriptive" ? "答案を保存して確認する" : "回答する",
    async () => {
      if (submitted) return;
      const given = answer.input.value.trim();
      result.replaceChildren();
      if (!given) {
        notice(result, "答えを入力、または選択してください。", true);
        (radios[0] ?? answer.input).focus();
        return;
      }
      if (mode === "holdout" && (!unseen.input.checked || hints > 0 || revealed)) {
        notice(
          result,
          "初めての問題であることを確認してください。ヒントや解説を見た場合は練習モードで回答してください。",
          true,
        );
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
      await saveAttempt(attempt);
      progress.record(
        p.topic,
        correct && !hints && !revealed ? "good" : "again",
        Date.now(),
        Date.now() - startedAt,
        p.id,
        given,
      );
      submitted = true;
      if (draftKey) sessionStorage.removeItem(draftKey);
      answer.input.readOnly = true;
      for (const radio of radios) radio.disabled = true;
      unseen.input.disabled = true;
      submit.hidden = true;
      help.hidden = true;
      history.push(attempt);
      options.onComplete?.(attempt);
      const outcome = h(
        "div",
        { class: `study-outcome ${correct === null ? "held" : correct ? "correct" : "incorrect"}`, role: "status" },
        h(
          "h4",
          { tabindex: "-1" },
          correct === null ? "答案を保存しました" : correct ? "正解です" : "ここを確認しましょう",
        ),
        h(
          "p",
          {},
          correct === null
            ? "解説と自分の答案を、手順ごとに見比べましょう。"
            : `${hints > 0 || revealed ? "ヒント・解説を使った回答" : "自力での回答"}として記録しました。`,
        ),
      );
      result.append(outcome);
      if (correct !== null)
        result.append(
          h(
            "div",
            { class: "study-answer-comparison" },
            h("div", {}, h("span", {}, "あなたの答え"), h("strong", { html: safeHtml(formatMath(given)) })),
            h("div", {}, h("span", {}, "正答"), h("strong", { html: safeHtml(formatMath(p.answer)) })),
          ),
        );
      result.append(solutionNode(p, "解き方を理解する"));
      if (p.format === "descriptive")
        result.append(
          disclosure(
            "数値式の検算結果",
            table(
              ["行", "数値式の確認", "結果"],
              inspectSteps(given).map((row) => [row.line, row.status, row.reason]),
            ),
            h(
              "p",
              { class: "muted" },
              "数値の一致だけで電気的な前提や論説の正しさは判定しません。解釈できない式は保留です。",
            ),
          ),
        );
      if (p.choices)
        result.append(
          disclosure(
            "ほかの選択肢を確認する",
            table(
              ["選択肢", "照合", "確認する点"],
              p.choices.map((choice) => [
                choice,
                choice === p.answer ? "正答" : "不一致",
                choice === p.answer ? "解説の前提・単位を確認" : distractorReason(choice, p.answer),
              ]),
            ),
          ),
        );
      const reflection = area("次に気をつけること（任意）", "", 2);
      const reflect = disclosure(
        "つまずきをノートに残す",
        cause.field,
        reflection.field,
        button("間違いノートへ残す", async () => {
          await saveRecord("note", crypto.randomUUID(), {
            problemId: p.id,
            revision: p.revision,
            topic: p.topic,
            answer: given,
            cause: cause.input.value,
            reason: why.input.value,
            estimate: estimate.input.value,
            text: reflection.input.value,
            createdAt: Date.now(),
          });
          notice(reflect, "学習ノートに保存しました");
        }),
      );
      result.append(reflect);
      result.append(
        disclosure(
          "前提の確認・質問・書き出し",
          h(
            "ul",
            {},
            ...(PREREQUISITES[cause.input.value] ?? ["問題の条件", "使う式", "単位と検算"]).map((text) =>
              h("li", {}, text),
            ),
          ),
          button("監修者への確認依頼を残す", async () => {
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
          button("ノート・別のAIへ引き継ぐ", () =>
            download(
              `DENKEN-${p.id}.md`,
              portableContext({
                problemId: p.id,
                revision: p.revision,
                statement: p.statement,
                answer: given,
                hints,
                source: p.source.citation ?? "DENKEN-OS独自教材",
              }),
              "text/markdown",
            ),
          ),
        ),
      );
      if (options.onNext)
        result.append(
          h("div", { class: "study-next-action" }, button(options.nextLabel ?? "次の問題へ", options.onNext, true)),
        );
      if (result.isConnected) focusHeading(outcome.querySelector("h4"));
    },
    true,
  );
  const actions = h(
    "div",
    { class: "study-submit" },
    submit,
    h("span", { class: "lab-meta" }, "入力途中の答えは、このタブで復元できます。"),
  );
  if (draft?.answer) answerControls.append(h("p", { class: "lab-meta" }, "入力途中の回答を復元しました。"));
  if (revealed || hints > 0)
    answerControls.append(h("p", { class: "lab-meta" }, "前回この問題で使用したヒント・解説も記録に引き継ぎます。"));
  work.append(answerControls, actions, help, result);
  wrap.append(h("div", { class: "study-problem-columns" }, question, work));
  root.append(wrap);
}

function distractorReason(choice: string, answer: string): string {
  const get = (value: string) => Number(value.normalize("NFKC").match(/[-+]?\d+(?:\.\d+)?/)?.[0]);
  const given = get(choice),
    correct = get(answer);
  if (!Number.isFinite(given) || !Number.isFinite(correct) || !correct) return "式の適用条件・単位・内容を解説と比較";
  const ratio = given / correct;
  const factors: [number, string][] = [
    [1000, "k/Mなどの接頭語"],
    [0.001, "k/Mなどの接頭語"],
    [3, "三相と一相の区別"],
    [Math.sqrt(3), "線間量と相量の区別"],
    [2, "最大値・実効値や係数の条件"],
  ];
  const found = factors.find(([factor]) => Math.abs(ratio - factor) < factor * 0.02);
  return found ? `確認する原因候補：${found[1]}（原因の断定ではありません）` : "代入する量、単位、桁を解説と比較";
}
