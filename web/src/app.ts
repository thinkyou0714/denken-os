/**
 * app.ts — 電験二種 学習OS（オフライン PWA）のエントリ。
 * タブ型 SPA: 学習 / 復習 / 模試 / 進捗 / 公式 / 設定。
 *  - 学習: 弱点優先 or 科目ドリル。解答→即解説（数式整形）→FSRS 4段階評価。
 *  - 復習: 期限が来た論点＋間違いノートを再演習（想起練習）。
 *  - 模試: 時間制限・合格ライン(60%)判定で本番を再現。
 *  - 進捗: 科目別到達度・弱点・復習見込み・試験カウントダウン。
 * バックエンド不要・完全オフライン（Service Worker で app shell をキャッシュ）。
 */
import type { Problem, Subject } from "../../lib/engine/schema.js";
import { aggregateByTopic, weakestTopics } from "../../lib/scheduler/diagnosis.js";
import type { Rating } from "../../lib/scheduler/types.js";
import { cardText } from "../../lib/share-card/card-text.js";
import {
  bySubject,
  byTopic,
  dailyActivity,
  masteryLevel,
  overall,
  recentAccuracy,
  reviewForecast,
} from "./dashboard.js";
import { buildMockExam, isPrimaryPass, scoreExam, scoreExamBySubject } from "./exam.js";
import { FORMULAS } from "./formulas.js";
import { isAnswerCorrect } from "./grade.js";
import { formatMath } from "./mathfmt.js";
import { buildStudyPlan } from "./plan.js";
import { dueReviewProblems, mistakeNotebook } from "./review.js";
import { pickNextProblem } from "./select.js";
import { getDailyGoal, getExamDate, setDailyGoal, setExamDate } from "./settings.js";
import { LocalProgress } from "./store.js";

const SUBJECTS: Subject[] = ["理論", "電力", "機械", "法規", "電力管理", "機械制御"];
const TABS: ReadonlyArray<readonly [string, string]> = [
  ["practice", "学習"],
  ["review", "復習"],
  ["exam", "模試"],
  ["dashboard", "進捗"],
  ["formulas", "公式"],
  ["settings", "設定"],
];

type Children = (Node | string)[];
type Attrs = Record<string, string | number | boolean | ((e: Event) => void)>;

function h(tag: string, attrs: Attrs = {}, ...children: Children): HTMLElement {
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

const $ = (id: string) => document.getElementById(id) as HTMLElement;

const storage = window.localStorage;
const progress = new LocalProgress(storage);
let problems: Problem[] = [];
let view = "practice";

// 学習タブの状態
const practice: { current: Problem | null; shownAt: number; pool: Problem[] | null; subject: Subject | "all" } = {
  current: null,
  shownAt: 0,
  pool: null,
  subject: "all",
};

// 模試タブの状態
type ExamPreset = "all" | "primary" | "secondary";
interface ExamState {
  set: Problem[];
  idx: number;
  results: boolean[];
  startedAt: number;
  timerId: number | null;
  preset: ExamPreset;
}
let exam: ExamState | null = null;

/** 模試を終了（タイマー解除）して模試タブの初期画面へ戻る。 */
function endExam(): void {
  if (exam?.timerId) clearInterval(exam.timerId);
  exam = null;
  switchView("exam");
}

function weakTopics(): string[] {
  return weakestTopics(aggregateByTopic(progress.logs()).values(), Date.now(), 3);
}

function difficultyStars(n: number): string {
  return "★".repeat(Math.max(1, Math.min(5, n)));
}

function sourceText(p: Problem): string {
  return p.source.type === "original"
    ? `出典: ${p.source.citation ?? "DENKEN-OS オリジナル問題"}`
    : `出典: ${p.source.citation}`;
}

function solutionNode(p: Problem, label: string): HTMLElement {
  return h(
    "div",
    { class: "solution" },
    h("strong", {}, label),
    h("ol", {}, ...p.solution.map((s) => h("li", { html: formatMath(s) }))),
    h("p", { class: "src" }, sourceText(p)),
  );
}

/** 図（自前生成のインライン SVG・信頼済み）を表示するノード。 */
function figureNode(svgStr: string): HTMLElement {
  return h("figure", { class: "figure", html: svgStr });
}

// ---- ヘッダ / ナビ ----

function renderHeader(): void {
  $("streak").textContent = `🔥 連続 ${progress.streakDays()} 日`;
  const days = buildStudyPlan({
    examDateIso: getExamDate(storage),
    totalProblems: problems.length,
    todayCount: 0,
    dailyGoal: getDailyGoal(storage),
  }).daysLeft;
  $("countdown").textContent = `試験まで ${days} 日`;
}

function renderNav(): void {
  const nav = $("nav");
  nav.innerHTML = "";
  for (const [id, label] of TABS) {
    const due = id === "review" ? progress.dueTopics().length : 0;
    const btn = h("button", { type: "button", onclick: () => switchView(id) }, due > 0 ? `${label}・${due}` : label);
    if (id === view) btn.setAttribute("aria-current", "true");
    nav.appendChild(btn);
  }
}

function switchView(id: string): void {
  if (exam?.timerId) {
    clearInterval(exam.timerId);
    exam.timerId = null;
  }
  view = id;
  renderNav();
  render();
}

function render(): void {
  renderHeader();
  const root = $("view");
  root.innerHTML = "";
  if (view === "practice") renderPractice(root);
  else if (view === "review") renderReview(root);
  else if (view === "exam") renderExam(root);
  else if (view === "dashboard") renderDashboard(root);
  else if (view === "formulas") renderFormulas(root);
  else if (view === "settings") renderSettings(root);
}

// ---- 学習タブ ----

function practicePool(): Problem[] {
  if (practice.pool) return practice.pool; // 復習/間違いノートからのドリル
  if (practice.subject === "all") return problems;
  return problems.filter((p) => p.subject === practice.subject);
}

function renderPractice(root: HTMLElement): void {
  const toolbar = h(
    "div",
    { class: "toolbar" },
    h("label", { for: "subj" }, "分野:"),
    (() => {
      const sel = h("select", {
        id: "subj",
        onchange: (e) => {
          practice.subject = (e.target as HTMLSelectElement).value as Subject | "all";
          practice.pool = null;
          nextQuestion(root);
        },
      }) as HTMLSelectElement;
      sel.append(h("option", { value: "all" }, "苦手優先（全分野）"));
      for (const s of SUBJECTS) sel.append(h("option", { value: s }, s));
      if (!practice.pool) sel.value = practice.subject;
      return sel;
    })(),
  );
  if (practice.pool) {
    toolbar.append(
      h("span", { class: "muted" }, "復習ドリル中"),
      h(
        "button",
        {
          class: "chip",
          type: "button",
          onclick: () => {
            practice.pool = null;
            nextQuestion(root);
          },
        },
        "解除",
      ),
    );
  }
  root.append(toolbar, h("div", { id: "q" }));
  nextQuestion(root);
}

function nextQuestion(root: HTMLElement): void {
  const host = root.querySelector("#q") as HTMLElement | null;
  if (!host) return;
  practice.current = pickNextProblem(practicePool(), {
    weakTopics: weakTopics(),
    excludeId: practice.current?.id,
  });
  host.innerHTML = "";
  const p = practice.current;
  if (!p) {
    host.append(h("p", {}, "この分野の問題がありません。"));
    return;
  }
  practice.shownAt = Date.now();
  host.append(
    h("div", { id: "meta" }, `${p.subject}・${p.topic}・難易度${difficultyStars(p.difficulty)}`),
    h("div", { class: "stmt", html: formatMath(p.statement) }),
  );
  if (p.figure) host.append(figureNode(p.figure));
  host.append(h("div", { class: "answers", id: "answers" }), h("div", { id: "result" }));
  renderAnswerInputs(host, p);
}

function renderAnswerInputs(host: HTMLElement, p: Problem): void {
  const answers = host.querySelector("#answers") as HTMLElement;
  answers.innerHTML = "";
  if (p.choices && p.choices.length > 0) {
    for (const choice of p.choices) {
      const btn = h(
        "button",
        { class: "choice", type: "button", onclick: () => gradeObjective(host, p, choice, btn) },
        choice,
      );
      answers.append(btn);
    }
  } else if (p.format === "descriptive") {
    const reveal = h(
      "button",
      { class: "choice", type: "button", onclick: () => revealDescriptive(host, p) },
      "模範解答を表示して自己採点",
    );
    answers.append(reveal);
  } else {
    const input = h("input", {
      id: "num",
      class: "num",
      inputmode: "decimal",
      placeholder: "答えを入力",
      "aria-label": "数値の答え",
    }) as HTMLInputElement;
    input.addEventListener("keydown", (e) => {
      if ((e as KeyboardEvent).key === "Enter") gradeObjective(host, p, input.value, null);
    });
    answers.append(
      input,
      h(
        "button",
        { class: "choice", type: "button", onclick: () => gradeObjective(host, p, input.value, null) },
        "回答",
      ),
    );
  }
}

/** MC / numeric: 客観採点（正誤を自動判定）→ 解説 → FSRS評価。 */
function gradeObjective(host: HTMLElement, p: Problem, given: string, clicked: HTMLElement | null): void {
  const correct = isAnswerCorrect(p, given);
  const answers = host.querySelector("#answers") as HTMLElement;
  for (const b of Array.from(answers.querySelectorAll("button"))) (b as HTMLButtonElement).disabled = true;
  const input = answers.querySelector("#num") as HTMLInputElement | null;
  if (input) input.disabled = true;
  if (clicked) clicked.classList.add(correct ? "correct" : "wrong");

  const result = host.querySelector("#result") as HTMLElement;
  result.innerHTML = "";
  result.append(
    h("div", { class: `feedback ${correct ? "ok" : "ng"}` }, correct ? "⭕ 正解！" : `❌ 不正解（正解: ${p.answer}）`),
    solutionNode(p, "解説"),
  );
  if (correct) {
    // 正解 → 想起の難易度を自己申告（FSRS）。
    result.append(
      ratingBar(host, p, [
        ["hard", "むずかしい"],
        ["good", "できた"],
        ["easy", "余裕"],
      ]),
    );
  } else {
    // 不正解 → again 記録して次へ。
    finalize(host, p, "again");
  }
}

/** descriptive: 模範解答を見せて4段階自己採点。 */
function revealDescriptive(host: HTMLElement, p: Problem): void {
  const answers = host.querySelector("#answers") as HTMLElement;
  answers.innerHTML = "";
  const result = host.querySelector("#result") as HTMLElement;
  result.innerHTML = "";
  result.append(
    solutionNode(p, "模範解答"),
    h("div", { class: "muted" }, "自分の解答と照合して自己採点:"),
    ratingBar(host, p, [
      ["again", "書けなかった"],
      ["hard", "部分的"],
      ["good", "書けた"],
      ["easy", "完璧"],
    ]),
  );
}

function ratingBar(host: HTMLElement, p: Problem, opts: ReadonlyArray<readonly [Rating, string]>): HTMLElement {
  const bar = h("div", { class: "rate" });
  for (const [rating, label] of opts) {
    bar.append(h("button", { type: "button", onclick: () => finalize(host, p, rating) }, label));
  }
  return bar;
}

function finalize(host: HTMLElement, p: Problem, rating: Rating): void {
  const timeMs = Date.now() - practice.shownAt;
  progress.record(p.topic, rating, Date.now(), timeMs, p.id);
  const result = host.querySelector("#result") as HTMLElement;
  // 既存の評価バーを除去し、シェア文＋次へを出す。
  for (const r of Array.from(result.querySelectorAll(".rate"))) r.remove();
  result.append(
    h(
      "div",
      { class: "share" },
      cardText("daily", {
        streakDays: progress.streakDays(),
        todayMinutes: progress.todayMinutes(),
        weeklyMinutes: 0,
      }),
    ),
    h("button", { class: "primary", id: "next", type: "button", onclick: () => nextQuestion($("view")) }, "次の問題 →"),
  );
  renderHeader();
  renderNav();
}

// ---- 復習タブ ----

function renderReview(root: HTMLElement): void {
  const due = progress.dueTopics();
  const dueProblems = dueReviewProblems(problems, due);
  const notebook = mistakeNotebook(progress.logs(), problems, 30);

  root.append(h("h2", {}, "復習キュー（期限到来）"));
  if (dueProblems.length === 0) {
    root.append(
      h("p", { class: "muted" }, "いま復習期限が来ている論点はありません。学習タブで新しい問題に挑戦しましょう。"),
    );
  } else {
    root.append(
      h("p", { class: "muted" }, `${due.length} 論点・${dueProblems.length} 問が復習対象です。`),
      h(
        "button",
        { class: "primary", type: "button", onclick: () => startDrill(dueProblems) },
        `▶ 復習ドリルを開始（${dueProblems.length}問）`,
      ),
    );
    const list = h("div", {});
    for (const topic of due.slice(0, 12)) {
      const v = progress.getCardView(topic);
      list.append(
        h(
          "div",
          { class: "card" },
          h("strong", {}, topic),
          v ? h("span", { class: "muted" }, ` ・ 安定度 ${v.stability.toFixed(1)}日 / lapses ${v.lapses}`) : "",
        ),
      );
    }
    root.append(list);
  }

  root.append(h("h2", {}, "間違いノート"));
  if (notebook.length === 0) {
    root.append(h("p", { class: "muted" }, "まだ誤答はありません（または誤答が記録された問題がありません）。"));
  } else {
    root.append(
      h(
        "button",
        { class: "primary", type: "button", onclick: () => startDrill(notebook.map((m) => m.problem)) },
        `▶ 間違いだけ再演習（${notebook.length}問）`,
      ),
    );
    const list = h("div", {});
    for (const m of notebook.slice(0, 15)) {
      list.append(
        h(
          "div",
          { class: "card" },
          h("div", { html: formatMath(m.problem.statement) }),
          h(
            "div",
            { class: "muted" },
            `${m.problem.subject}・${m.problem.topic} ／ 誤答 ${m.missCount}回 / 試行 ${m.attempts}回`,
          ),
        ),
      );
    }
    root.append(list);
  }
}

function startDrill(pool: Problem[]): void {
  practice.pool = pool;
  practice.current = null;
  switchView("practice");
}

// ---- 模試タブ ----

function renderExam(root: HTMLElement): void {
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

function startExam(count: number, preset: ExamPreset): void {
  const subjects =
    preset === "primary"
      ? (["理論", "電力", "機械", "法規"] as Subject[])
      : preset === "secondary"
        ? (["電力管理", "機械制御"] as Subject[])
        : undefined;
  const set = buildMockExam(problems, { count, subjects });
  if (set.length === 0) {
    switchView("exam");
    return;
  }
  exam = { set, idx: 0, results: [], startedAt: Date.now(), timerId: null, preset };
  switchView("exam");
}

function renderExamRunning(root: HTMLElement): void {
  if (!exam) return;
  if (exam.idx >= exam.set.length) {
    renderExamResult(root);
    return;
  }
  const p = exam.set[exam.idx]!;
  const header = h(
    "div",
    { class: "toolbar" },
    h("strong", {}, `第 ${exam.idx + 1} / ${exam.set.length} 問`),
    h("span", { class: "muted", id: "timer" }, "0:00"),
    h(
      "button",
      {
        class: "chip",
        type: "button",
        onclick: () => endExam(),
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
    exam!.results.push(correct);
    progress.record(p.topic, correct ? "good" : "again", Date.now(), undefined, p.id);
    exam!.idx += 1;
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
    input.addEventListener("keydown", (e) => {
      if ((e as KeyboardEvent).key === "Enter") advance(isAnswerCorrect(p, input.value));
    });
    answers.append(
      input,
      h("button", { class: "choice", type: "button", onclick: () => advance(isAnswerCorrect(p, input.value)) }, "回答"),
    );
  }
}

function startTimer(): void {
  if (!exam) return;
  if (exam.timerId) clearInterval(exam.timerId);
  exam.timerId = window.setInterval(() => {
    const t = $("timer");
    if (!t || !exam) return;
    const s = Math.floor((Date.now() - exam.startedAt) / 1000);
    t.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }, 1000);
}

function renderExamResult(root: HTMLElement): void {
  if (!exam) return;
  if (exam.timerId) {
    clearInterval(exam.timerId);
    exam.timerId = null;
  }
  const score = scoreExam(exam.results);
  const mins = Math.floor((Date.now() - exam.startedAt) / 60000);
  // 科目別内訳（電験一次は科目ごとに合否＝各60%）
  const subjectScores = scoreExamBySubject(exam.set, exam.results);

  root.append(
    h("h2", {}, "模試結果"),
    h(
      "div",
      { class: "big", style: `color:${score.passed ? "var(--ok)" : "var(--ng)"}` },
      `${score.scorePct}点 ${score.passed ? "🎉 合格ライン突破" : "✊ あと一歩"}`,
    ),
    h("p", { class: "muted" }, `${score.correct} / ${score.total} 問正解 ・ 所要 ${mins} 分`),
  );
  // 一次プリセットは「全科目60%以上」で本番合格判定。
  if (exam.preset === "primary") {
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
  root.append(
    breakdown,
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

// ---- 進捗タブ ----

function bar(pct: number): HTMLElement {
  return h("div", { class: "bar" }, h("span", { style: `width:${Math.max(0, Math.min(100, pct))}%` }));
}

function masteryChip(level: string): HTMLElement {
  const cls = level === "習得" ? "m3" : level === "習得中" ? "m2" : level === "要復習" ? "m1" : "m0";
  return h("span", { class: `chip ${cls}` }, level);
}

function renderDashboard(root: HTMLElement): void {
  const logs = progress.logs();
  const o = overall(logs);
  const plan = buildStudyPlan({
    examDateIso: getExamDate(storage),
    totalProblems: problems.length,
    todayCount: progress.logs().filter((l) => sameJstDay(l.atMs, Date.now())).length,
    dailyGoal: getDailyGoal(storage),
  });

  root.append(
    h(
      "div",
      { class: "grid2" },
      h(
        "div",
        { class: "card" },
        h("div", { class: "muted" }, "試験まで"),
        h("div", { class: "big" }, `${plan.daysLeft}日`),
      ),
      h(
        "div",
        { class: "card" },
        h("div", { class: "muted" }, "総合正答率"),
        h("div", { class: "big" }, `${Math.round(o.accuracy * 100)}%`),
      ),
    ),
    h(
      "div",
      { class: "grid2" },
      h(
        "div",
        { class: "card" },
        h("div", { class: "muted" }, "今日の学習"),
        h("div", {}, `${plan.todayCount} / ${plan.dailyGoal} 問 ${plan.metToday ? "✅" : ""}`),
      ),
      h(
        "div",
        { class: "card" },
        h("div", { class: "muted" }, "推奨ペース"),
        h("div", {}, `1日 ${plan.recommendedPerDay} 問（2巡）`),
      ),
    ),
    h(
      "p",
      { class: "muted" },
      `総解答 ${o.attempts} 問 ・ 学習論点 ${o.topicsStudied} ・ 直近20問 ${Math.round(recentAccuracy(logs) * 100)}%`,
    ),
  );

  root.append(h("h2", {}, "科目別 到達度"));
  for (const r of bySubject(logs, problems)) {
    const level = masteryLevel(r);
    root.append(
      h("div", { class: "row" }, h("span", {}, r.subject), bar(Math.round(r.accuracy * 100)), masteryChip(level)),
    );
  }

  const weak = byTopic(logs)
    .filter((t) => t.attempts > 0)
    .slice(0, 5);
  if (weak.length > 0) {
    root.append(h("h2", {}, "弱点 論点 TOP5"));
    for (const t of weak) {
      root.append(
        h(
          "div",
          { class: "row" },
          h("span", { style: "white-space:nowrap;overflow:hidden;text-overflow:ellipsis" }, t.topic),
          bar(Math.round(t.accuracy * 100)),
          h("span", {}, `${Math.round(t.accuracy * 100)}%`),
        ),
      );
    }
  }

  const fc = reviewForecast(progress.allCardViews().values(), Date.now(), 7);
  root.append(
    h("h2", {}, "今後7日の復習見込み"),
    h(
      "div",
      { class: "toolbar" },
      ...fc.map((n, i) =>
        h(
          "div",
          { class: "card", style: "flex:1;text-align:center;min-width:2.4rem" },
          h("div", { class: "muted" }, i === 0 ? "今日" : `+${i}`),
          h("div", {}, String(n)),
        ),
      ),
    ),
  );

  // 学習ヒートマップ（直近14日の解答数。継続の可視化）
  const activity = dailyActivity(logs, 14, Date.now());
  const maxCount = Math.max(1, ...activity.map((a) => a.count));
  root.append(
    h("h2", {}, "学習ヒートマップ（直近14日）"),
    h(
      "div",
      { class: "toolbar", style: "gap:.2rem;align-items:flex-end" },
      ...activity.map((a) => {
        const intensity = a.count === 0 ? 0.08 : 0.25 + 0.75 * (a.count / maxCount);
        return h("div", {
          title: `${a.offset === 0 ? "今日" : `${a.offset}日`}: ${a.count}問`,
          style: `flex:1;min-width:1rem;height:${8 + Math.round((a.count / maxCount) * 28)}px;border-radius:.2rem;background:var(--accent);opacity:${intensity}`,
        });
      }),
    ),
    h("p", { class: "muted" }, "毎日少しずつが最強。分散学習が忘却に勝ちます。"),
  );
}

function sameJstDay(a: number, b: number): boolean {
  const off = 9 * 3600_000;
  return Math.floor((a + off) / 86_400_000) === Math.floor((b + off) / 86_400_000);
}

// ---- 公式タブ ----

function renderFormulas(root: HTMLElement): void {
  root.append(
    h("h2", {}, "公式集"),
    h("p", { class: "muted" }, "暗記だけでなく導出の足がかりに。出題テンプレートと対応しています。"),
  );
  for (const group of FORMULAS) {
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
    root.append(h("h2", {}, group.subject), table);
  }
}

// ---- 設定タブ ----

function renderSettings(root: HTMLElement): void {
  root.append(h("h2", {}, "設定"));
  const examInput = h("input", { type: "date", value: getExamDate(storage) }) as HTMLInputElement;
  examInput.addEventListener("change", () => {
    setExamDate(storage, examInput.value);
    renderHeader();
  });
  const goalInput = h("input", {
    type: "number",
    min: "1",
    max: "200",
    value: String(getDailyGoal(storage)),
  }) as HTMLInputElement;
  goalInput.addEventListener("change", () => setDailyGoal(storage, Number(goalInput.value)));
  const retSel = h("select", {}) as HTMLSelectElement;
  for (const r of [0.8, 0.85, 0.9, 0.95]) retSel.append(h("option", { value: r }, `${Math.round(r * 100)}%`));
  retSel.value = String(progress.desiredRetention());
  retSel.addEventListener("change", () => progress.setDesiredRetention(Number(retSel.value)));

  root.append(
    h("div", { class: "card" }, h("label", {}, "試験日 "), examInput),
    h("div", { class: "card" }, h("label", {}, "1日の目標問題数 "), goalInput),
    h(
      "div",
      { class: "card" },
      h("label", {}, "FSRS 目標保持率 "),
      retSel,
      h("div", { class: "muted" }, "高いほど復習間隔が短く、定着重視になります（既定90%）。"),
    ),
    h("h2", {}, "データ"),
    h(
      "button",
      { class: "choice", type: "button", style: "border-color:var(--ng);color:var(--ng)", onclick: resetData },
      "学習記録をリセット",
    ),
  );
}

function resetData(): void {
  if (!window.confirm("学習記録（解答ログ・記憶状態）を全て削除します。よろしいですか？")) return;
  for (const k of ["denken:cards", "denken:logs"]) storage.setItem(k, JSON.stringify(k === "denken:logs" ? [] : {}));
  switchView("dashboard");
}

// ---- キーボード操作 ----

function onKeydown(e: KeyboardEvent): void {
  if (view !== "practice" && view !== "exam") return;
  const tag = (e.target as HTMLElement)?.tagName;
  if (tag === "INPUT" || tag === "SELECT") return;
  const root = $("view");
  if (e.key === "Enter") {
    (root.querySelector("#next") as HTMLButtonElement | null)?.click();
    return;
  }
  const n = Number(e.key);
  if (n >= 1 && n <= 9) {
    const choices = root.querySelectorAll(".answers .choice, #eanswers .choice");
    (choices[n - 1] as HTMLButtonElement | undefined)?.click();
  }
}

// ---- 起動 ----

async function main(): Promise<void> {
  try {
    const res = await fetch("./problems.json");
    problems = (await res.json()) as Problem[];
  } catch {
    problems = [];
  }
  document.addEventListener("keydown", onKeydown);
  renderNav();
  render();
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
}

main();
