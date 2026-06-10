/**
 * app.ts — 電験二種 学習OS（オフライン PWA）のエントリ。
 * タブ型 SPA: 学習 / 復習 / 模試 / 質問 / 進捗 / 公式 / 設定。
 *  - 学習: 弱点優先 or 科目ドリル。解答→即解説（数式整形）→FSRS 4段階評価。
 *  - 復習: 期限が来た論点＋間違いノートを再演習（想起練習）。
 *  - 模試: 時間制限・合格ライン(60%)判定で本番を再現。
 *  - 質問: AIチャット。既定は内蔵ナレッジ（オフライン・出典付き）、
 *          APIキー設定時は Claude にローカル検索結果を注入して回答（RAG・BYOK）。
 *  - 進捗: 科目別到達度・弱点・復習見込み・試験カウントダウン。
 * バックエンド不要・完全オフライン（Service Worker で app shell をキャッシュ）。
 */
import { answerLocally, SUGGESTED_QUESTIONS } from "../../lib/chat/answer.js";
import { KNOWLEDGE } from "../../lib/chat/knowledge.js";
import { buildApiMessages, buildSystemPrompt, CHAT_MODELS } from "../../lib/chat/prompt.js";
import { retrieve } from "../../lib/chat/retrieve.js";
import type { ChatMessage } from "../../lib/chat/types.js";
import type { Problem, Subject } from "../../lib/engine/schema.js";
import { aggregateByTopic, weakestTopics } from "../../lib/scheduler/diagnosis.js";
import type { Rating } from "../../lib/scheduler/types.js";
import { cardText } from "../../lib/share-card/card-text.js";
import { exportBackup, importBackup } from "./backup.js";
import { appendChatMessage, clearChat, loadChat, streamClaude } from "./chat.js";
import {
  accuracyTrend,
  bySubject,
  byTopic,
  dailyActivity,
  masteryLevel,
  overall,
  recentAccuracy,
  reviewForecast,
} from "./dashboard.js";
import { recoveryView } from "./errors.js";
import { buildMockExam, examTimeLimitMs, isPrimaryPass, scoreExam, scoreExamBySubject } from "./exam.js";
import { formatElapsed, formatRemaining } from "./format.js";
import { FORMULAS, filterFormulas } from "./formulas.js";
import { isAnswerCorrect, partialScore } from "./grade.js";
import { formatMath } from "./mathfmt.js";
import { buildStudyPlan } from "./plan.js";
import { dailyReviewBatch, offlineLabel, streakStatus } from "./retention.js";
import { dueReviewProblems, mistakeNotebook } from "./review.js";
import { pickNextProblem } from "./select.js";
import {
  getApiKey,
  getChatModel,
  getDailyGoal,
  getExamDate,
  getReviewCap,
  getTheme,
  isOnboarded,
  setApiKey,
  setChatModel,
  setDailyGoal,
  setExamDate,
  setOnboarded,
  setReviewCap,
  setTheme,
  type ThemePref,
} from "./settings.js";
import { LocalProgress } from "./store.js";

const SUBJECTS: Subject[] = ["理論", "電力", "機械", "法規", "電力管理", "機械制御"];
const TABS: ReadonlyArray<readonly [string, string, string]> = [
  ["practice", "学習", "✏️"],
  ["review", "復習", "🔁"],
  ["exam", "模試", "📝"],
  ["chat", "質問", "💬"],
  ["dashboard", "進捗", "📊"],
  ["formulas", "公式", "📐"],
  ["settings", "設定", "⚙️"],
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

/** テーマ設定を解決して <html data-theme> に反映（system は OS 追従）。 */
function applyTheme(): void {
  const pref = getTheme(storage);
  const dark = pref === "dark" || (pref === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}

let problems: Problem[] = [];
let view = "practice";

// 学習タブの状態
const practice: {
  current: Problem | null;
  shownAt: number;
  pool: Problem[] | null;
  subject: Subject | "all";
  /** 現在の問題で開示したヒント段数（0=未使用）。 */
  hintsShown: number;
} = {
  current: null,
  shownAt: 0,
  pool: null,
  subject: "all",
  hintsShown: 0,
};

/** problems.json の読込に失敗したか（オフライン初回起動など）。リトライ導線を出す。 */
let loadFailed = false;

// 模試タブの状態
type ExamPreset = "all" | "primary" | "secondary";
interface ExamState {
  set: Problem[];
  idx: number;
  results: boolean[];
  startedAt: number;
  timerId: number | null;
  preset: ExamPreset;
  /** 制限時間（ms）。形式別の持ち時間合計（examTimeLimitMs）。 */
  limitMs: number;
  /** 時間切れで強制終了したか（結果画面で明示する）。 */
  timedOut: boolean;
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

/** 今日（JST日基準）の解答数。日次目標の達成判定に使う。 */
function todayCount(): number {
  return progress.logs().filter((l) => sameJstDay(l.atMs, Date.now())).length;
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

/** 空状態（履歴なし等）の上質な表示。 */
function emptyState(emoji: string, title: string, msg: string): HTMLElement {
  return h(
    "div",
    { class: "empty" },
    h("span", { class: "emoji" }, emoji),
    h("div", { class: "et" }, title),
    h("div", {}, msg),
  );
}

/** 0..1 の系列からスパークライン SVG を作る（2点以上のとき）。 */
function sparklineNode(values: number[]): HTMLElement | null {
  if (values.length < 2) return null;
  const w = 320;
  const hh = 40;
  const pad = 3;
  const n = values.length;
  const x = (i: number) => pad + (i * (w - 2 * pad)) / (n - 1);
  const y = (v: number) => pad + (1 - Math.max(0, Math.min(1, v))) * (hh - 2 * pad);
  const line = values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${x(n - 1).toFixed(1)} ${hh - pad} L${x(0).toFixed(1)} ${hh - pad} Z`;
  const svg =
    `<svg class="spark" viewBox="0 0 ${w} ${hh}" preserveAspectRatio="none" role="img" aria-label="正答率の推移">` +
    `<path class="area" d="${area}"/><path class="line" d="${line}"/></svg>`;
  return h("div", { html: svg });
}

/** 達成率のリングプログレス（日次目標など）。 */
function ringNode(value: number, max: number): HTMLElement {
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  const r = 24;
  const c = 2 * Math.PI * r;
  const off = c * (1 - pct);
  const svg =
    `<svg width="58" height="58" viewBox="0 0 58 58" role="img" aria-label="今日の達成率 ${Math.round(pct * 100)}%">` +
    `<circle cx="29" cy="29" r="${r}" fill="none" stroke="var(--surface-2)" stroke-width="6"/>` +
    `<circle cx="29" cy="29" r="${r}" fill="none" stroke="var(--accent)" stroke-width="6" stroke-linecap="round" ` +
    `stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" transform="rotate(-90 29 29)"/>` +
    `<text x="29" y="34" text-anchor="middle" fill="currentColor" font-size="14" font-weight="700">${Math.round(pct * 100)}%</text></svg>`;
  return h("div", { html: svg, style: "flex:none" });
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
  updateNetStatus();
}

/** オフライン表示の更新（オンライン時は隠す）。完全オフライン動作なので障害ではなく状態通知。 */
function updateNetStatus(): void {
  const el = document.getElementById("netstatus");
  if (!el) return;
  const label = offlineLabel(navigator.onLine);
  el.textContent = label;
  el.hidden = label === "";
}

function renderNav(): void {
  const nav = $("nav");
  nav.innerHTML = "";
  // 復習バッジは「今日出す分」（上限でバッチ化）の件数に合わせ、過大表示で圧迫しない。
  // 完了した復習は FSRS が due から外すため、ここでは上限キャップのみ適用する。
  const dueCount = dailyReviewBatch(progress.dueTopics(), getReviewCap(storage)).batch.length;
  for (const [id, label, icon] of TABS) {
    const due = id === "review" ? dueCount : 0;
    const selected = id === view;
    const btn = h(
      "button",
      {
        type: "button",
        role: "tab",
        id: `tab-${id}`,
        "aria-label": label,
        "aria-selected": selected ? "true" : "false",
        tabindex: selected ? "0" : "-1",
        onclick: () => switchView(id),
      },
      h("span", { class: "ti", "aria-hidden": "true" }, icon),
      h("span", { class: "tl" }, label),
    );
    if (due > 0) btn.append(h("span", { class: "tb" }, String(due)));
    if (selected) btn.setAttribute("aria-current", "true");
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
  const root = $("view");
  root.innerHTML = "";
  // エラーバウンダリ: 描画例外でSPA全体が白画面になり「壊れた」と離脱されるのを防ぐ。
  // 例外時は安心メッセージ＋復旧導線を出し、学習記録が無事であることを伝える。
  try {
    renderHeader();
    if (view === "practice") renderPractice(root);
    else if (view === "review") renderReview(root);
    else if (view === "exam") renderExam(root);
    else if (view === "chat") renderChat(root);
    else if (view === "dashboard") renderDashboard(root);
    else if (view === "formulas") renderFormulas(root);
    else if (view === "settings") renderSettings(root);
  } catch (err) {
    renderErrorBoundary(root, err);
  }
}

/** 描画例外時の復旧画面。 */
function renderErrorBoundary(root: HTMLElement, err: unknown): void {
  const rv = recoveryView(err);
  root.innerHTML = "";
  root.append(
    h(
      "div",
      { class: "card errbound", role: "alert" },
      h("strong", {}, `⚠️ ${rv.title}`),
      h("p", {}, rv.reassurance),
      h("button", { class: "primary", type: "button", onclick: () => location.reload() }, "再読み込み"),
      h(
        "details",
        {},
        h("summary", {}, "エラーの詳細"),
        (() => {
          const pre = h("pre", { class: "errdetail" });
          pre.textContent = rv.detail; // textContent で安全に（XSS 回避）
          return pre;
        })(),
      ),
    ),
  );
}

// ---- 学習タブ ----

function practicePool(): Problem[] {
  if (practice.pool) return practice.pool; // 復習/間違いノートからのドリル
  if (practice.subject === "all") return problems;
  return problems.filter((p) => p.subject === practice.subject);
}

/** 初回オンボーディング（学習記録ゼロのときだけ表示。既読で消える）。 */
function onboardingCard(root: HTMLElement): HTMLElement {
  return h(
    "div",
    { class: "card onboard" },
    h("strong", {}, "👋 はじめまして！3ステップで始められます"),
    h(
      "ol",
      {},
      h("li", {}, "問題を解く（選択肢はキーボード 1〜9 でも答えられます）"),
      h("li", {}, "正解したら「むずかしい/できた/余裕」で自己評価 → 復習間隔が自動調整されます"),
      h("li", {}, "復習タブに出た問題を毎日消化 → 忘れる直前の復習で定着します"),
    ),
    h(
      "button",
      {
        class: "chip",
        type: "button",
        onclick: (e) => {
          setOnboarded(storage);
          ((e.target as HTMLElement).closest(".onboard") as HTMLElement | null)?.remove();
          root.focus?.();
        },
      },
      "了解、始める",
    ),
  );
}

function renderPractice(root: HTMLElement): void {
  if (!isOnboarded(storage) && progress.logs().length === 0) root.append(onboardingCard(root));
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
    if (loadFailed && problems.length === 0) {
      // 読込失敗を行き止まりにしない（リトライ導線）。
      host.append(
        emptyState("📡", "問題データを読み込めませんでした", "通信状況を確認して、もう一度お試しください。"),
        h("button", { class: "primary", type: "button", onclick: () => void reloadProblems() }, "再読み込み"),
      );
    } else {
      host.append(emptyState("🔍", "この分野の問題がありません", "別の分野を選ぶか、復習ドリルを解除してください。"));
    }
    return;
  }
  practice.shownAt = Date.now();
  practice.hintsShown = 0;
  const stmt = h("div", { class: "stmt", tabindex: "-1", html: formatMath(p.statement) });
  host.append(h("div", { id: "meta" }, `${p.subject}・${p.topic}・難易度${difficultyStars(p.difficulty)}`), stmt);
  if (p.figure) host.append(figureNode(p.figure));
  // ヒント段階開示: 解答前に解説の先頭ステップ（着眼点）だけ覗ける（最大2段）。
  // 「すぐ答えを見る」より一段粘る足場を作り、想起練習の質を上げる。
  const maxHints = Math.min(2, p.solution.length - 1);
  if (maxHints > 0) {
    const hintHost = h("div", { id: "hints" });
    const hintBtn = h(
      "button",
      {
        class: "chip hintbtn",
        type: "button",
        onclick: () => {
          if (practice.hintsShown >= maxHints) return;
          const step = p.solution[practice.hintsShown]!;
          practice.hintsShown += 1;
          hintHost.append(h("div", { class: "hint", html: `💡 ヒント${practice.hintsShown}: ${formatMath(step)}` }));
          if (practice.hintsShown >= maxHints) (hintBtn as HTMLButtonElement).disabled = true;
          hintBtn.textContent = `💡 ヒントを見る（${practice.hintsShown}/${maxHints}）`;
        },
      },
      `💡 ヒントを見る（0/${maxHints}）`,
    );
    host.append(hintBtn, hintHost);
  }
  host.append(h("div", { class: "answers", id: "answers" }), h("div", { id: "result" }));
  renderAnswerInputs(host, p);
  // 次の問題へ進んだことをスクリーンリーダー/キーボード利用者に伝える。
  stmt.focus({ preventScroll: true });
}

function renderAnswerInputs(host: HTMLElement, p: Problem): void {
  const answers = host.querySelector("#answers") as HTMLElement;
  answers.innerHTML = "";
  if (p.choices && p.choices.length > 0) {
    p.choices.forEach((choice, i) => {
      // 番号バッジ: キーボード 1〜9 ショートカットとの対応を可視化する。
      const btn = h(
        "button",
        { class: "choice", type: "button", onclick: () => gradeObjective(host, p, choice, btn) },
        h("span", { class: "kbd", "aria-hidden": "true" }, String(i + 1)),
        choice,
      );
      answers.append(btn);
    });
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
  const elapsed = formatElapsed(Date.now() - practice.shownAt);
  result.append(
    h(
      "div",
      { class: `feedback ${correct ? "ok" : "ng"}` },
      correct ? "⭕ 正解！" : `❌ 不正解（正解: ${p.answer}）`,
      h(
        "span",
        { class: "elapsed" },
        `⏱ ${elapsed}${practice.hintsShown > 0 ? ` ・ ヒント${practice.hintsShown}` : ""}`,
      ),
    ),
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
/** 記述(二次): 模範解答の各ステップを採点観点とし、書けた項目にチェック→部分点で自己採点。 */
function revealDescriptive(host: HTMLElement, p: Problem): void {
  const answers = host.querySelector("#answers") as HTMLElement;
  answers.innerHTML = "";
  const result = host.querySelector("#result") as HTMLElement;
  result.innerHTML = "";
  const steps = p.solution;
  const checks: HTMLInputElement[] = [];
  const list = h("div", { class: "rubric" });
  steps.forEach((s, i) => {
    const cb = h("input", { type: "checkbox", id: `rb${i}` }) as HTMLInputElement;
    checks.push(cb);
    list.append(h("label", { class: "rubric-item", for: `rb${i}` }, cb, h("span", { html: formatMath(s) })));
  });
  const grade = h(
    "button",
    {
      class: "primary",
      type: "button",
      onclick: () => {
        const checked = checks.filter((c) => c.checked).length;
        const { pct, rating } = partialScore(checked, steps.length);
        finalize(host, p, rating, { checked, total: steps.length, pct });
      },
    },
    "採点する",
  );
  result.append(
    h(
      "div",
      { class: "gradeui solution" },
      h("strong", {}, "模範解答（採点観点）"),
      h("p", { class: "muted" }, "各ステップを自分の解答と照合し、書けた項目にチェック → 採点する（部分点で評価）"),
      list,
      h("p", { class: "src" }, sourceText(p)),
      grade,
    ),
  );
}

function ratingBar(host: HTMLElement, p: Problem, opts: ReadonlyArray<readonly [Rating, string]>): HTMLElement {
  const bar = h("div", { class: "rate" });
  for (const [rating, label] of opts) {
    bar.append(h("button", { type: "button", onclick: () => finalize(host, p, rating) }, label));
  }
  return bar;
}

function finalize(
  host: HTMLElement,
  p: Problem,
  rating: Rating,
  score?: { checked: number; total: number; pct: number },
): void {
  const timeMs = Date.now() - practice.shownAt;
  const before = todayCount();
  progress.record(p.topic, rating, Date.now(), timeMs, p.id);
  // 日次目標の達成瞬間を祝う（達成に気づけないと目標の駆動力が出ない）。
  const goal = getDailyGoal(storage);
  if (before < goal && todayCount() >= goal) {
    showToast(`🎉 今日の目標 ${goal} 問を達成！この調子！`, "OK", () => {});
  }
  const result = host.querySelector("#result") as HTMLElement;
  // 既存の評価バー・採点UIを除去し、結果＋シェア文＋次へを出す。
  for (const r of Array.from(result.querySelectorAll(".rate, .gradeui"))) r.remove();
  if (score) {
    // 記述: 採点UIを消した後に模範解答を残し、先頭に部分点フィードバックを置く。
    result.append(solutionNode(p, "模範解答"));
    const ok = score.pct >= 2 / 3;
    result.insertBefore(
      h(
        "div",
        { class: `feedback ${ok ? "ok" : "ng"}` },
        `📝 部分点 ${score.checked}/${score.total}（${Math.round(score.pct * 100)}%）${ok ? "— 合格圏" : "— 要強化"}`,
      ),
      result.firstChild,
    );
  }
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
  // ストリーク予兆ナッジ（崩れる前に背中を押す）。
  const ss = streakStatus(progress.logs());
  if (ss.state === "at-risk" || ss.state === "broken") {
    root.append(h("div", { class: `card nudge ${ss.state}` }, h("span", {}, ss.message)));
  }

  // 1日上限でバッチ化（大量の復習による離脱を防ぐ）。
  const allDue = progress.dueTopics();
  const cap = getReviewCap(storage);
  const { batch, overflow, capped } = dailyReviewBatch(allDue, cap);
  const dueProblems = dueReviewProblems(problems, batch);
  const notebook = mistakeNotebook(progress.logs(), problems, 30);

  root.append(h("h2", {}, "復習キュー（期限到来）"));
  if (allDue.length === 0) {
    root.append(
      emptyState(
        "✅",
        "復習はすべて完了",
        "いま期限が来ている論点はありません。学習タブで新しい問題に挑戦しましょう。",
      ),
    );
  } else if (dueProblems.length === 0) {
    // due はあるが対応する問題が手元に無い（topic に問題が紐づかない）レアケース。
    root.append(emptyState("📭", "今日の復習対象の問題が見つかりません", "学習タブで新しい問題に挑戦しましょう。"));
  } else {
    root.append(
      h(
        "p",
        { class: "muted" },
        `今日の復習 ${batch.length} 論点・${dueProblems.length} 問` +
          (capped ? `（期限到来は計 ${allDue.length} 論点。残り ${overflow} は明日以降に回します）` : ""),
      ),
      h(
        "button",
        { class: "primary", type: "button", onclick: () => startDrill(dueProblems) },
        `▶ 復習ドリルを開始（${dueProblems.length}問）`,
      ),
    );
    if (capped) {
      root.append(
        h(
          "p",
          { class: "muted small" },
          `1日の復習上限は ${cap} 件です（設定で変更可）。少しずつ確実に消化するのが定着への近道です。`,
        ),
      );
    }
    const list = h("div", {});
    for (const topic of batch.slice(0, 12)) {
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
    root.append(emptyState("📝", "間違いノートは空です", "誤答した問題がここに集まり、ワンタップで再演習できます。"));
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
  exam = {
    set,
    idx: 0,
    results: [],
    startedAt: Date.now(),
    timerId: null,
    preset,
    limitMs: examTimeLimitMs(set),
    timedOut: false,
  };
  switchView("exam");
}

/** 時間切れ: 未解答の残り問題は本番同様 0 点（不正解）として結果へ。
 *  ただし出題されていない問題なので FSRS 記録は付けない（記憶状態を汚さない）。 */
function timeoutExam(): void {
  if (!exam) return;
  while (exam.results.length < exam.set.length) exam.results.push(false);
  exam.idx = exam.set.length;
  exam.timedOut = true;
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

/** 残り時間のカウントダウン（時間制限の本実装）。0 で自動終了し本番を再現する。 */
function startTimer(): void {
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
    h(
      "p",
      { class: "muted" },
      `${score.correct} / ${score.total} 問正解 ・ 所要 ${mins} 分（制限 ${Math.round(exam.limitMs / 60_000)} 分）`,
    ),
  );
  if (exam.timedOut) {
    root.append(
      h(
        "div",
        { class: "card", style: "border-color:var(--ng)" },
        h("strong", {}, "⏰ 時間切れ"),
        h("div", { class: "muted" }, "未解答の問題は本番同様 0 点で採点しました。時間配分も実力のうちです。"),
      ),
    );
  }
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
  root.append(breakdown);

  // 見直し: 模試をスコアで終わらせず学習に繋げる（テスト効果の回収）。
  // 各問題の○×一覧＋タップで問題文と解説を展開。間違いだけの再演習ドリルも起動できる。
  const wrong = exam.set.filter((_, i) => !exam!.results[i]);
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
  exam.set.forEach((p, i) => {
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

// ---- 質問タブ（AIチャット）----

/** 送信中フラグ（多重送信の防止）。 */
const chatState = { busy: false };

/** チャット1件の吹き出しノード。assistant は数式整形（HTMLエスケープ込み）して表示。 */
function bubbleNode(msg: ChatMessage): HTMLElement {
  if (msg.role === "user") {
    const b = h("div", { class: "msg user" });
    b.textContent = msg.content;
    return b;
  }
  const b = h("div", { class: "msg bot", html: formatMath(msg.content) });
  if (msg.citations && msg.citations.length > 0) {
    b.append(h("div", { class: "src" }, `出典: ${msg.citations.join(" ／ ")}`));
  }
  return b;
}

function chatLogNode(messages: ChatMessage[]): HTMLElement {
  const log = h("div", { class: "chat", id: "chatlog" });
  if (messages.length === 0) {
    log.append(
      emptyState("💬", "電験のことなら何でも聞いてください", "用語・公式・試験制度・勉強法に、出典付きで答えます。"),
    );
  }
  for (const m of messages) log.append(bubbleNode(m));
  return log;
}

function scrollChatToBottom(): void {
  const log = document.getElementById("chatlog");
  if (log) log.scrollTop = log.scrollHeight;
}

/** おすすめ質問チップ。クリックで即送信。 */
function chatChips(questions: readonly string[]): HTMLElement {
  const wrap = h("div", { class: "chips" });
  for (const q of questions) {
    wrap.append(h("button", { class: "chip", type: "button", onclick: () => void sendChat(q) }, q));
  }
  return wrap;
}

async function sendChat(question: string): Promise<void> {
  const q = question.trim();
  if (chatState.busy || q.length === 0) return;
  chatState.busy = true;
  appendChatMessage(storage, { role: "user", content: q, atMs: Date.now() });
  renderChatLogOnly();

  const apiKey = getApiKey(storage);
  // どちらのモードでもまずローカル検索（API モードではグラウンディング文脈に流用）。
  const hits = retrieve(q, KNOWLEDGE, { k: 4 });

  if (!apiKey) {
    const a = answerLocally(q);
    appendChatMessage(storage, {
      role: "assistant",
      content: a.text,
      citations: a.citations,
      mode: "local",
      atMs: Date.now(),
    });
    chatState.busy = false;
    renderChatLogOnly(a.suggestions);
    return;
  }

  // API モード: ストリーミング表示。失敗時はローカル回答へフォールバック（沈黙させない）。
  const log = document.getElementById("chatlog");
  const live = h("div", { class: "msg bot streaming" }, "…");
  log?.append(live);
  scrollChatToBottom();
  let acc = "";
  try {
    const history = loadChat(storage);
    const stream = streamClaude({
      apiKey,
      model: getChatModel(storage),
      system: buildSystemPrompt(hits.map((hit) => hit.entry)),
      messages: buildApiMessages(history),
    });
    for await (const chunk of stream) {
      acc += chunk;
      live.innerHTML = formatMath(acc);
      scrollChatToBottom();
    }
    appendChatMessage(storage, {
      role: "assistant",
      content: acc,
      citations: hits.map((hit) => hit.entry.citation),
      mode: "api",
      atMs: Date.now(),
    });
  } catch (e) {
    const local = answerLocally(q);
    const note = e instanceof Error ? e.message : "APIに接続できませんでした。";
    appendChatMessage(storage, {
      role: "assistant",
      content: `⚠️ ${note}\n（内蔵ナレッジで回答します）\n\n${local.text}`,
      citations: local.citations,
      mode: "local",
      atMs: Date.now(),
    });
  } finally {
    chatState.busy = false;
    renderChatLogOnly();
  }
}

/** 入力欄を保ったままログ部分だけ再描画する（入力中テキストを失わせない）。 */
function renderChatLogOnly(suggestions?: readonly string[]): void {
  if (view !== "chat") return;
  const host = document.getElementById("chathost");
  if (!host) return;
  host.innerHTML = "";
  host.append(chatLogNode(loadChat(storage)));
  if (suggestions && suggestions.length > 0) host.append(chatChips(suggestions));
  scrollChatToBottom();
  const btn = document.getElementById("chatsend") as HTMLButtonElement | null;
  if (btn) btn.disabled = chatState.busy;
}

function renderChat(root: HTMLElement): void {
  const apiKey = getApiKey(storage);
  const history = loadChat(storage);
  const toolbar = h(
    "div",
    { class: "toolbar" },
    h("span", { class: "pill" }, apiKey ? "✨ Claude API（ローカル検索で接地）" : "📚 内蔵ナレッジ（オフライン）"),
    h(
      "button",
      {
        class: "chip",
        type: "button",
        onclick: () => {
          if (!window.confirm("チャット履歴を消去します。よろしいですか？")) return;
          clearChat(storage);
          switchView("chat");
        },
      },
      "履歴を消去",
    ),
  );

  const host = h("div", { id: "chathost" });
  host.append(chatLogNode(history));
  if (history.length === 0) host.append(chatChips(SUGGESTED_QUESTIONS));

  const input = h("textarea", {
    id: "chatin",
    rows: "2",
    placeholder: "電験の質問を入力（Enterで送信 / Shift+Enterで改行）",
    "aria-label": "質問を入力",
  }) as HTMLTextAreaElement;
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      const q = input.value;
      input.value = "";
      void sendChat(q);
    }
  });
  const send = h(
    "button",
    {
      class: "primary",
      id: "chatsend",
      type: "button",
      onclick: () => {
        const q = input.value;
        input.value = "";
        void sendChat(q);
      },
    },
    "送信",
  ) as HTMLButtonElement;
  send.disabled = chatState.busy;

  root.append(
    toolbar,
    host,
    h("div", { class: "composer" }, input, send),
    h(
      "p",
      { class: "muted" },
      apiKey
        ? "AI回答は誤りを含む可能性があります。数値は学習タブの検算済み問題で確認を。法令は最新の条文を確認してください。"
        : "内蔵ナレッジから出典付きで回答します。設定タブで Anthropic API キーを登録すると、Claude による自由質問に切り替わります。",
    ),
  );
  scrollChatToBottom();
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
  if (logs.length === 0) {
    root.append(
      emptyState(
        "📊",
        "まだ学習記録がありません",
        "学習タブで問題を解くと、ここに到達度や正答率の推移が表示されます。",
      ),
      h("button", { class: "primary", type: "button", onclick: () => switchView("practice") }, "学習を始める →"),
    );
    return;
  }
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
        { class: "card today" },
        ringNode(plan.todayCount, plan.dailyGoal),
        h(
          "div",
          {},
          h("div", { class: "muted" }, "今日の学習"),
          h("div", {}, `${plan.todayCount} / ${plan.dailyGoal} 問 ${plan.metToday ? "✅" : ""}`),
        ),
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

  const spark = sparklineNode(accuracyTrend(logs));
  if (spark) root.append(h("h2", {}, "正答率の推移"), spark);

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

  // 学習ヒートマップ（直近14日の解答数。GitHub風の強度セル）
  const activity = dailyActivity(logs, 14, Date.now());
  const maxCount = Math.max(1, ...activity.map((a) => a.count));
  root.append(
    h("h2", {}, "学習ヒートマップ（直近14日）"),
    h(
      "div",
      { class: "heat" },
      ...activity.map((a) => {
        const lv = a.count === 0 ? 0 : Math.min(4, 1 + Math.floor((a.count / maxCount) * 3.99));
        return h("div", {
          class: `cell lv${lv}`,
          title: `${a.offset === 0 ? "今日" : `${a.offset}日前`}: ${a.count}問`,
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

function renderFormulas(root: HTMLElement): void {
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
  const capInput = h("input", {
    type: "number",
    min: "5",
    max: "200",
    value: String(getReviewCap(storage)),
  }) as HTMLInputElement;
  capInput.addEventListener("change", () => {
    setReviewCap(storage, Number(capInput.value));
    capInput.value = String(getReviewCap(storage));
    renderNav();
  });
  const retSel = h("select", {}) as HTMLSelectElement;
  for (const r of [0.8, 0.85, 0.9, 0.95]) retSel.append(h("option", { value: r }, `${Math.round(r * 100)}%`));
  retSel.value = String(progress.desiredRetention());
  retSel.addEventListener("change", () => progress.setDesiredRetention(Number(retSel.value)));

  const themeSel = h("select", {}) as HTMLSelectElement;
  for (const [v, label] of [
    ["system", "システムに合わせる"],
    ["light", "ライト"],
    ["dark", "ダーク"],
  ] as const) {
    themeSel.append(h("option", { value: v }, label));
  }
  themeSel.value = getTheme(storage);
  themeSel.addEventListener("change", () => {
    setTheme(storage, themeSel.value as ThemePref);
    applyTheme();
  });

  // AIチャット（BYOK）: キーは端末内 localStorage のみ・送信先は Anthropic のみ。
  const keyInput = h("input", {
    type: "password",
    placeholder: "sk-ant-...",
    autocomplete: "off",
    value: getApiKey(storage),
    "aria-label": "Anthropic API キー",
  }) as HTMLInputElement;
  keyInput.addEventListener("change", () => setApiKey(storage, keyInput.value));
  const modelSel = h("select", {}) as HTMLSelectElement;
  for (const m of CHAT_MODELS) modelSel.append(h("option", { value: m.id }, m.label));
  modelSel.value = getChatModel(storage);
  modelSel.addEventListener("change", () => setChatModel(storage, modelSel.value));

  root.append(
    h("div", { class: "card" }, h("label", {}, "テーマ "), themeSel),
    h("div", { class: "card" }, h("label", {}, "試験日 "), examInput),
    h("div", { class: "card" }, h("label", {}, "1日の目標問題数 "), goalInput),
    h(
      "div",
      { class: "card" },
      h("label", {}, "1日の復習上限 "),
      capInput,
      h("div", { class: "muted" }, "復習が多すぎると挫折しやすいため、1日に出す復習件数の上限です（既定30）。"),
    ),
    h(
      "div",
      { class: "card" },
      h("label", {}, "FSRS 目標保持率 "),
      retSel,
      h("div", { class: "muted" }, "高いほど復習間隔が短く、定着重視になります（既定90%）。"),
    ),
    h("h2", {}, "AIチャット（質問タブ）"),
    h(
      "div",
      { class: "card" },
      h("label", {}, "Anthropic API キー（任意） "),
      keyInput,
      h(
        "div",
        { class: "muted" },
        "未設定でも内蔵ナレッジで動作します。キーはこの端末の localStorage にのみ保存され、" +
          "送信先は api.anthropic.com のみです。共有端末では設定しないでください。",
      ),
      h(
        "button",
        {
          class: "chip",
          type: "button",
          onclick: () => {
            setApiKey(storage, "");
            keyInput.value = "";
          },
        },
        "キーを削除",
      ),
    ),
    h("div", { class: "card" }, h("label", {}, "回答モデル "), modelSel),
    h("h2", {}, "データ"),
    backupCard(),
    h(
      "button",
      { class: "choice", type: "button", style: "border-color:var(--ng);color:var(--ng)", onclick: resetData },
      "学習記録をリセット",
    ),
  );
}

/** バックアップ: localStorage 単一保存の単一障害点対策（書き出し/読み込み）。 */
function backupCard(): HTMLElement {
  const exportBtn = h(
    "button",
    {
      class: "choice",
      type: "button",
      onclick: () => {
        const json = exportBackup(storage);
        const a = document.createElement("a");
        const date = new Date().toISOString().slice(0, 10);
        a.href = URL.createObjectURL(new Blob([json], { type: "application/json" }));
        a.download = `denken-backup-${date}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
      },
    },
    "⬇ 学習データを書き出す（バックアップ）",
  );
  const fileInput = h("input", { type: "file", accept: "application/json,.json", hidden: true }) as HTMLInputElement;
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    fileInput.value = "";
    if (!file) return;
    if (!window.confirm("バックアップを読み込みます。現在の学習データは上書きされます。よろしいですか？")) return;
    const result = importBackup(storage, await file.text());
    if (result.ok) {
      showToast(`✅ ${result.restoredKeys.length} 項目を復元しました`, "再読込", () => location.reload());
    } else {
      showToast(`⚠️ 復元できませんでした: ${result.reason}`, "OK", () => {});
    }
  });
  const importBtn = h(
    "button",
    { class: "choice", type: "button", onclick: () => fileInput.click() },
    "⬆ バックアップを読み込む（復元）",
  );
  return h(
    "div",
    { class: "card" },
    h("label", {}, "バックアップ "),
    h(
      "div",
      { class: "muted" },
      "学習記録はこの端末にのみ保存されます。ブラウザのデータ削除や機種変更で消えるため、定期的に書き出してください（APIキーは含まれません）。",
    ),
    exportBtn,
    importBtn,
    fileInput,
  );
}

function resetData(): void {
  if (!window.confirm("学習記録（解答ログ・記憶状態）を全て削除します。よろしいですか？")) return;
  for (const k of ["denken:cards", "denken:logs"]) storage.setItem(k, JSON.stringify(k === "denken:logs" ? [] : {}));
  switchView("dashboard");
}

// ---- キーボード操作 ----

function onKeydown(e: KeyboardEvent): void {
  // タブ（role=tab）にフォーカスがある間は左右矢印でタブ移動（WAI-ARIA tablist の定石）。
  const active = document.activeElement as HTMLElement | null;
  if (active?.getAttribute("role") === "tab" && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
    e.preventDefault();
    const ids = TABS.map(([id]) => id);
    const cur = ids.indexOf(view);
    const next = e.key === "ArrowRight" ? (cur + 1) % ids.length : (cur - 1 + ids.length) % ids.length;
    switchView(ids[next]!);
    document.getElementById(`tab-${ids[next]}`)?.focus();
    return;
  }

  if (view !== "practice" && view !== "exam") return;
  const tag = (e.target as HTMLElement)?.tagName;
  if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
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

/** 読込中のスケルトン（problems.json 取得まで）。 */
function renderSkeleton(): void {
  $("view").innerHTML =
    '<div class="skel-line skeleton w40"></div><div class="skel-line skeleton big"></div>' +
    '<div class="skel-line skeleton"></div><div class="skel-line skeleton w60"></div>' +
    '<div class="skel-line skeleton"></div><div class="skel-line skeleton"></div>';
}

/** 問題データの取得。失敗してもアプリは起動し、学習タブにリトライ導線を出す。 */
async function reloadProblems(): Promise<void> {
  try {
    const res = await fetch("./problems.json");
    if (!res.ok) throw new Error(String(res.status));
    problems = (await res.json()) as Problem[];
    loadFailed = false;
  } catch {
    problems = [];
    loadFailed = true;
  }
  render();
}

async function main(): Promise<void> {
  applyTheme();
  // system 設定時は OS のテーマ変更に追従。
  matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", () => {
    if (getTheme(storage) === "system") applyTheme();
  });
  renderNav();
  renderSkeleton();
  await reloadProblems();
  document.addEventListener("keydown", onKeydown);
  // オフライン状態の変化をヘッダに反映（完全オフライン動作だが状態は明示する）。
  window.addEventListener("online", updateNetStatus);
  window.addEventListener("offline", updateNetStatus);
  registerServiceWorker();
}

/** Service Worker 登録＋更新検知（新版があればトーストで再読込を案内）。 */
function registerServiceWorker(): void {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker
    .register("./sw.js")
    .then((reg) => {
      reg.addEventListener("updatefound", () => {
        const sw = reg.installing;
        if (!sw) return;
        sw.addEventListener("statechange", () => {
          // 既存コントローラがある状態で新版が installed = 更新あり。
          if (sw.state === "installed" && navigator.serviceWorker.controller) {
            showToast("新しいバージョンがあります", "更新", () => location.reload());
          }
        });
      });
    })
    .catch(() => {});
}

/** 画面下中央のトースト（任意のアクションボタン付き）。 */
function showToast(message: string, actionLabel: string, action: () => void): void {
  document.querySelector(".toast")?.remove();
  const toast = h(
    "div",
    { class: "toast", role: "status" },
    h("span", {}, message),
    h(
      "button",
      {
        type: "button",
        onclick: () => {
          toast.remove();
          action();
        },
      },
      actionLabel,
    ),
  );
  document.body.appendChild(toast);
}

main();
