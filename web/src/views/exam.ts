/**
 * views/exam.ts — 模試タブの描画・タイマー・開始/終了処理。
 * renderExam / startExam / timeoutExam / renderExamRunning / renderExamResult /
 * startTimer / endExam
 */

import type { Subject } from "../../../lib/engine/schema.js";
import { buildMockExam, examTimeLimitMs, isPrimaryPass, scoreExam, scoreExamBySubject } from "../exam.js";
import { formatRemaining } from "../format.js";
import { confettiBurst, playTone } from "../fx.js";
import { isAnswerCorrect, normalizeNumericInput } from "../grade.js";
import { formatMath } from "../mathfmt.js";
import { allQuestsClear, allWeeklyQuestsClear, dayIndexOf, logsOfDay, logsOfWeek, weekIndexOf } from "../quests.js";
import { getDailyGoal, getSoundLevel } from "../settings.js";
import { problems, progress, storage } from "../state/app.js";
import { type ExamPreset, exam, setExam } from "../state/exam.js";
import { todayCount } from "../state/practice.js";
import { $, h } from "../ui/dom.js";
import { showToast } from "../ui/toast.js";
import { bar, difficultyStars, figureNode, solutionNode } from "../ui/widgets.js";
import { processRewards } from "./practice-rewards.js";
import { startDrill } from "./review.js";
import { renderHeader, switchView } from "./router.js";

/** 模試を終了（タイマー解除）して模試タブの初期画面へ戻る。 */
export function endExam(): void {
  if (exam?.timerId) clearInterval(exam.timerId);
  setExam(null);
  switchView("exam");
}

export function renderExam(root: HTMLElement): void {
  if (exam) {
    renderExamRunning(root);
    return;
  }
  root.append(
    h("h2", {}, "模試（時間制限・合格ライン60%）"),
    h("p", { class: "muted" }, "本番の緊張感で実力を測り、弱点を炙り出します。記述は自己採点です。"),
  );
  let count = 10;
  let preset: "all" | "primary" | "secondary" = "all";
  const toolbar = h(
    "div",
    { class: "toolbar" },
    h("label", { for: "ecount" }, "問題数:"),
    (() => {
      const sel = h("select", {
        id: "ecount",
        onchange: (e) => {
          count = Number((e.target as HTMLSelectElement).value);
        },
      }) as HTMLSelectElement;
      for (const n of [5, 10, 20, 30]) sel.append(h("option", { value: n }, String(n)));
      sel.value = "10";
      return sel;
    })(),
    h("label", { for: "epreset" }, "範囲:"),
    (() => {
      const sel = h("select", {
        id: "epreset",
        onchange: (e) => {
          preset = (e.target as HTMLSelectElement).value as typeof preset;
        },
      }) as HTMLSelectElement;
      sel.append(
        h("option", { value: "all" }, "全分野"),
        h("option", { value: "primary" }, "一次（理論/電力/機械/法規）"),
        h("option", { value: "secondary" }, "二次（電力管理/機械制御）"),
      );
      return sel;
    })(),
  );
  root.append(
    toolbar,
    h("button", { class: "primary", type: "button", onclick: () => startExam(count, preset) }, "▶ 模試を開始"),
  );
}

export function startExam(count: number, preset: ExamPreset): void {
  const subjects =
    preset === "primary"
      ? (["理論", "電力", "機械", "法規"] as Subject[])
      : preset === "secondary"
        ? (["電力管理", "機械制御"] as Subject[])
        : undefined;
  const set = buildMockExam(problems, { count, ...(subjects !== undefined ? { subjects } : {}) });
  if (set.length === 0) {
    switchView("exam");
    return;
  }
  const todayIdx = dayIndexOf(Date.now());
  const weekIdx = weekIndexOf(Date.now());
  setExam({
    set,
    idx: 0,
    results: [],
    startedAt: Date.now(),
    timerId: null,
    preset,
    limitMs: examTimeLimitMs(set),
    timedOut: false,
    questsClearAtStart: allQuestsClear(logsOfDay(progress.logs(), todayIdx), todayIdx),
    weeklyClearAtStart: allWeeklyQuestsClear(logsOfWeek(progress.logs(), weekIdx), weekIdx),
    todayCountAtStart: todayCount(),
    celebrated: false,
  });
  switchView("exam");
}

/** 時間切れ: 未解答の残り問題は本番同様 0 点（不正解）として結果へ。
 *  ただし出題されていない問題なので FSRS 記録は付けない（記憶状態を汚さない）。 */
export function timeoutExam(): void {
  if (!exam) return;
  while (exam.results.length < exam.set.length) exam.results.push(false);
  exam.idx = exam.set.length;
  exam.timedOut = true;
  switchView("exam");
}

export function renderExamRunning(root: HTMLElement): void {
  if (!exam) return;
  if (exam.idx >= exam.set.length) {
    renderExamResult(root);
    return;
  }
  // exam.idx < exam.set.length を直前でチェック済みのため安全。
  const p = exam.set[exam.idx] as (typeof exam.set)[number];
  const header = h(
    "div",
    { class: "toolbar" },
    h("strong", {}, `第 ${exam.idx + 1} / ${exam.set.length} 問`),
    h(
      "span",
      { class: "muted", id: "timer", "aria-label": "残り時間" },
      `残り ${formatRemaining(exam.limitMs - (Date.now() - exam.startedAt))}`,
    ),
    h(
      "button",
      {
        class: "chip",
        type: "button",
        onclick: () => {
          // 誤タップで途中経過が消えるのを防ぐ（取り返しのつかない操作には確認を挟む）。
          if (!window.confirm("模試を中断して最初に戻りますか？（途中経過は破棄されます）")) return;
          endExam();
        },
      },
      "中断",
    ),
  );
  const host = h("div", {});
  host.append(
    h("div", { id: "meta" }, `${p.subject}・難易度${difficultyStars(p.difficulty)}`),
    h("div", { class: "stmt", html: formatMath(p.statement) }),
  );
  if (p.figure) host.append(figureNode(p.figure));
  host.append(h("div", { class: "answers", id: "eanswers" }));
  root.append(header, host);
  startTimer();

  const answers = host.querySelector("#eanswers") as HTMLElement;
  const advance = (correct: boolean) => {
    if (!exam) return;
    exam.results.push(correct);
    progress.record(p.topic, correct ? "good" : "again", Date.now(), undefined, p.id);
    exam.idx += 1;
    switchView("exam");
  };
  if (p.choices && p.choices.length > 0) {
    for (const c of p.choices)
      answers.append(
        h("button", { class: "choice", type: "button", onclick: () => advance(isAnswerCorrect(p, c)) }, c),
      );
  } else if (p.format === "descriptive") {
    answers.append(
      h("div", { class: "muted" }, "記述: 解答後に模範解答と照合して自己採点します。"),
      h(
        "button",
        {
          class: "choice",
          type: "button",
          onclick: () => {
            answers.innerHTML = "";
            answers.append(
              solutionNode(p, "模範解答"),
              h(
                "div",
                { class: "rate" },
                h("button", { type: "button", onclick: () => advance(true) }, "✅ できた"),
                h("button", { type: "button", onclick: () => advance(false) }, "❌ できなかった"),
              ),
            );
          },
        },
        "模範解答を表示",
      ),
    );
  } else {
    const input = h("input", {
      class: "num",
      inputmode: "decimal",
      placeholder: "答えを入力",
      "aria-label": "数値の答え",
    }) as HTMLInputElement;
    // 空入力は受け付けない（誤タップを0点扱いにしない。スキップは中断/時間切れで明示的に）。
    const submit = () => {
      if (normalizeNumericInput(input.value) === "") {
        input.focus();
        return;
      }
      advance(isAnswerCorrect(p, input.value));
    };
    input.addEventListener("keydown", (e) => {
      if ((e as KeyboardEvent).key === "Enter") submit();
    });
    answers.append(input, h("button", { class: "choice", type: "button", onclick: submit }, "回答"));
  }
}

/** 残り時間のカウントダウン（時間制限の本実装）。0 で自動終了し本番を再現する。 */
export function startTimer(): void {
  if (!exam) return;
  if (exam.timerId) clearInterval(exam.timerId);
  exam.timerId = window.setInterval(() => {
    const t = $("timer");
    if (!t || !exam) return;
    const remaining = exam.limitMs - (Date.now() - exam.startedAt);
    if (remaining <= 0) {
      timeoutExam();
      return;
    }
    t.textContent = `残り ${formatRemaining(remaining)}`;
    t.classList.toggle("timer-warn", remaining <= 60_000); // ラスト1分は警告色
  }, 1000);
}

// ---- 結果画面（renderExamResult を3セクション関数へ分解 I-054）----

function examScoreSection(root: HTMLElement, score: ReturnType<typeof scoreExam>, mins: number): void {
  root.append(
    h("h2", {}, "模試結果"),
    h(
      "div",
      { class: "big", style: `color:${score.passed ? "var(--ok)" : "var(--ng)"}` },
      `${score.scorePct}点 ${score.passed ? "🎉 合格ライン突破" : "✊ あと一歩"}`,
    ),
    h(
      "p",
      { class: "muted" },
      // biome-ignore lint/style/noNonNullAssertion: renderExamResult の `if (!exam) return` 後に呼ばれるため exam は非 null。
      `${score.correct} / ${score.total} 問正解 ・ 所要 ${mins} 分（制限 ${Math.round(exam!.limitMs / 60_000)} 分）`,
    ),
  );
  // biome-ignore lint/style/noNonNullAssertion: 同上 — renderExamResult でガード済み。
  if (exam!.timedOut) {
    root.append(
      h(
        "div",
        { class: "card", style: "border-color:var(--ng)" },
        h("strong", {}, "⏰ 時間切れ"),
        h("div", { class: "muted" }, "未解答の問題は本番同様 0 点で採点しました。時間配分も実力のうちです。"),
      ),
    );
  }
}

function examSubjectSection(root: HTMLElement, subjectScores: ReturnType<typeof scoreExamBySubject>): void {
  // 一次プリセットは「全科目60%以上」で本番合格判定。
  // biome-ignore lint/style/noNonNullAssertion: renderExamResult の `if (!exam) return` 後に呼ばれるため exam は非 null。
  if (exam!.preset === "primary") {
    const primaryPass = isPrimaryPass(subjectScores);
    root.append(
      h(
        "div",
        { class: "card", style: `border-color:${primaryPass ? "var(--ok)" : "var(--ng)"}` },
        h("strong", {}, primaryPass ? "✅ 一次 合格判定（全科目60%以上）" : "✗ 一次 不合格（足切り科目あり）"),
        h("div", { class: "muted" }, "本番は科目ごとに60%以上が必要。1科目でも下回ると不合格です。"),
      ),
    );
  }
  const breakdown = h("div", {});
  for (const v of subjectScores) {
    breakdown.append(
      h(
        "div",
        { class: "row" },
        h("span", {}, `${v.subject}${v.passed ? " ✅" : " ✗"}`),
        bar(v.scorePct),
        h("span", {}, `${v.correct}/${v.total}`),
      ),
    );
  }
  root.append(breakdown);
}

function examReviewSection(root: HTMLElement): void {
  // 見直し: 模試をスコアで終わらせず学習に繋げる（テスト効果の回収）。
  // biome-ignore lint/style/noNonNullAssertion: renderExamResult の `if (!exam) return` 後に呼ばれるため exam は非 null。
  const wrong = exam!.set.filter((_, i) => !exam!.results[i]);
  root.append(h("h2", {}, "見直し（問題別の結果）"));
  if (wrong.length > 0) {
    root.append(
      h(
        "button",
        { class: "primary", type: "button", onclick: () => startDrill(wrong) },
        `▶ 間違いだけ再演習（${wrong.length}問）`,
      ),
    );
  }
  const reviewList = h("div", { class: "exam-review" });
  // biome-ignore lint/style/noNonNullAssertion: 同上 — renderExamResult でガード済み。
  exam!.set.forEach((p, i) => {
    // biome-ignore lint/style/noNonNullAssertion: 同上 — renderExamResult でガード済み。
    const ok = exam!.results[i] === true;
    const details = h(
      "details",
      {},
      h(
        "summary",
        {},
        h("span", { class: ok ? "ok" : "ng" }, ok ? "⭕" : "❌"),
        h("span", { class: "qtitle" }, ` 第${i + 1}問 ${p.subject}・${p.topic}`),
      ),
      h("div", { class: "stmt-sm", html: formatMath(p.statement) }),
      solutionNode(p, "解説"),
    );
    reviewList.append(details);
  });
  root.append(
    reviewList,
    h(
      "button",
      {
        class: "primary",
        type: "button",
        onclick: () => endExam(),
      },
      "もう一度",
    ),
  );
}

export function renderExamResult(root: HTMLElement): void {
  if (!exam) return;
  if (exam.timerId) {
    clearInterval(exam.timerId);
    exam.timerId = null;
  }
  const score = scoreExam(exam.results);
  const mins = Math.floor((Date.now() - exam.startedAt) / 60000);
  // 科目別内訳（電験一次は科目ごとに合否＝各60%）
  const subjectScores = scoreExamBySubject(exam.set, exam.results);

  // 祝賀は初回表示の1回だけ（タブ往復での再発火を防ぐ）。
  if (!exam.celebrated) {
    exam.celebrated = true;
    const reward = processRewards({
      questsClear: exam.questsClearAtStart,
      weeklyClear: exam.weeklyClearAtStart,
    });
    const goal = getDailyGoal(storage);
    if (exam.todayCountAtStart < goal && todayCount() >= goal) {
      reward.celebrations.push(`🎉 模試で今日の目標 ${goal} 問を達成！`);
      reward.fanfare = reward.fanfare ?? "clear";
    }
    if (score.passed || reward.celebrations.length > 0) {
      confettiBurst(reward.bigConfetti ? 64 : 32);
      playTone(reward.fanfare ?? "clear", getSoundLevel(storage));
    }
    if (reward.celebrations.length > 0) {
      // celebrations.length > 0 を直前でチェック済みのため安全。
      showToast(reward.celebrations[0] as string, "OK", () => {});
    }
    renderHeader();
  }

  examScoreSection(root, score, mins);
  examSubjectSection(root, subjectScores);
  examReviewSection(root);
}
