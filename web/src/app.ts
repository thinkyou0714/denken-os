/**
 * app.ts — オフライン学習アプリ MVP のエントリ。
 * 仕様(成長ループ ②Aha/③継続)を最小実装:
 *  - 弱点 topic を優先して出題（lib/scheduler の診断）
 *  - 解答→即フィードバック＋解説、SM-2 で記憶状態を更新（localStorage 永続）
 *  - 連続日数・弱点・シェアテキストを表示
 * バックエンド不要・完全オフライン（Service Worker で app shell をキャッシュ）。
 */
import type { Problem } from "../../lib/engine/schema.js";
import { aggregateByTopic, weakestTopics } from "../../lib/scheduler/diagnosis.js";
import { cardText } from "../../lib/share-card/card-text.js";
import { LocalProgress } from "./store.js";

function weakTopics(): string[] {
  return weakestTopics(aggregateByTopic(progress.logs()).values(), Date.now(), 3);
}

const progress = new LocalProgress(window.localStorage);
let problems: Problem[] = [];
let current: Problem | null = null;
let questionShownAt = 0;

const $ = (id: string) => document.getElementById(id)!;

function pickNext(): Problem | null {
  if (problems.length === 0) return null;
  // 弱点 topic を優先（解答履歴があるとき）。無ければランダム。
  const weak = weakTopics();
  for (const topic of weak) {
    const candidates = problems.filter((p) => p.topic === topic);
    if (candidates.length > 0) return candidates[Math.floor(Math.random() * candidates.length)]!;
  }
  return problems[Math.floor(Math.random() * problems.length)]!;
}

function renderStats(): void {
  const streak = progress.streakDays();
  $("streak").textContent = `🔥 連続 ${streak} 日`;
  const weak = weakTopics();
  $("weak").textContent = weak.length > 0 ? `弱点: ${weak.join(" / ")}` : "弱点: （まだデータなし）";
}

function renderQuestion(): void {
  current = pickNext();
  $("feedback").textContent = "";
  $("solution").innerHTML = "";
  $("hints").innerHTML = "";
  $("share").textContent = "";
  if (!current) {
    $("statement").textContent = "問題が読み込めませんでした。";
    return;
  }
  questionShownAt = Date.now();
  const p = current;
  $("meta").textContent = metaLine(p);
  $("statement").textContent = p.statement;
  renderHints(p);

  const answers = $("answers");
  answers.innerHTML = "";
  if (p.choices && p.choices.length > 0) {
    // multiple_choice: 選択肢ボタン
    for (const choice of p.choices) {
      const btn = document.createElement("button");
      btn.className = "choice";
      btn.textContent = choice;
      btn.onclick = () => grade(choice);
      answers.appendChild(btn);
    }
  } else if (p.format === "descriptive") {
    // 記述(二次): 自動採点しない → 模範解答を表示して自己採点。
    const reveal = document.createElement("button");
    reveal.className = "choice";
    reveal.textContent = "模範解答を表示";
    reveal.onclick = () => {
      showSolution(p);
      answers.innerHTML = "";
      const ok = document.createElement("button");
      ok.className = "choice";
      ok.textContent = "✅ 自分の解答で書けた";
      ok.onclick = () => grade(p.answer); // 正解扱い
      const ng = document.createElement("button");
      ng.className = "choice";
      ng.textContent = "❌ 書けなかった";
      ng.onclick = () => grade("__self_incorrect__"); // 不正解扱い
      answers.appendChild(ok);
      answers.appendChild(ng);
    };
    answers.appendChild(reveal);
  } else {
    // numeric: 入力欄
    const input = document.createElement("input");
    input.id = "numeric-input";
    input.inputMode = "decimal";
    input.placeholder = "答えを入力";
    const btn = document.createElement("button");
    btn.className = "choice";
    btn.textContent = "回答";
    btn.onclick = () => grade(input.value.trim());
    answers.appendChild(input);
    answers.appendChild(btn);
  }
}

const LEVEL_LABEL: Record<string, string> = {
  remember: "記憶",
  understand: "理解",
  apply: "応用",
  analyze: "分析",
};

/** メタ行: 論点・難易度・想定時間・認知レベル。 */
function metaLine(p: Problem): string {
  const parts = [`${p.topic}・難易度${"★".repeat(p.difficulty)}`];
  if (p.estimated_time_sec) parts.push(`目安${Math.round(p.estimated_time_sec)}秒`);
  if (p.cognitive_level) parts.push(LEVEL_LABEL[p.cognitive_level] ?? p.cognitive_level);
  return parts.join("・");
}

/** 段階的ヒント（faded scaffolding）: ボタンで1つずつ開く。 */
function renderHints(p: Problem): void {
  const box = $("hints");
  box.innerHTML = "";
  const hints = p.hints;
  if (!hints || hints.length === 0) return;
  let shown = 0;
  const btn = document.createElement("button");
  btn.className = "hint-btn";
  const list = document.createElement("ol");
  list.className = "hint-list";
  const update = () => {
    btn.textContent = shown < hints.length ? `💡 ヒントを見る (${shown}/${hints.length})` : `ヒントは以上です`;
    btn.disabled = shown >= hints.length;
  };
  btn.onclick = () => {
    if (shown >= hints.length) return;
    const li = document.createElement("li");
    li.textContent = hints[shown]!;
    list.appendChild(li);
    shown += 1;
    update();
  };
  update();
  box.appendChild(btn);
  box.appendChild(list);
}

/** 使う公式（暗記カード/逆引き）。 */
function formulasHtml(p: Problem): string {
  if (!p.formulas || p.formulas.length === 0) return "";
  return `<p class="formula">使う公式: ${p.formulas.map(escapeHtml).join(" ／ ")}</p>`;
}

/** 誤答解説（最大の学習資産）: 各選択肢の正誤と理由。選んだ肢を強調。 */
function explanationsHtml(p: Problem, given?: string): string {
  if (!p.choice_explanations || p.choice_explanations.length === 0) return "";
  const items = p.choice_explanations
    .map((ce) => {
      const mark = ce.correct ? "⭕" : "❌";
      const you = ce.choice === given ? ' <span class="you">（あなたの解答）</span>' : "";
      return `<li class="${ce.correct ? "ex-ok" : "ex-ng"}">${mark} <strong>${escapeHtml(ce.choice)}</strong> — ${escapeHtml(ce.explanation)}${you}</li>`;
    })
    .join("");
  return `<div class="explain"><strong>選択肢の解説</strong><ul>${items}</ul></div>`;
}

/** 解説本体（解法ステップ＋公式＋誤答解説＋出典）をまとめて組む。 */
function richSolutionHtml(p: Problem, title: string, given?: string): string {
  const steps = `<ol>${p.solution.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ol>`;
  return (
    `<strong>${title}</strong>${steps}` +
    formulasHtml(p) +
    explanationsHtml(p, given) +
    `<p class="src">${escapeHtml(sourceText(p))}</p>`
  );
}

function showSolution(p: Problem): void {
  $("solution").innerHTML = richSolutionHtml(p, "模範解答");
}

function grade(given: string): void {
  if (!current) return;
  const p = current;
  const correct = given === p.answer;
  const timeMs = Date.now() - questionShownAt;
  progress.record(p.topic, correct, Date.now(), timeMs);

  $("feedback").textContent = correct ? "⭕ 正解！" : `❌ 不正解（正解: ${p.answer}）`;
  $("feedback").className = correct ? "ok" : "ng";
  $("hints").innerHTML = ""; // 採点後はヒントを畳む
  $("solution").innerHTML = richSolutionHtml(p, "解説", given);

  // シェアテキスト（記録カードの文言。画像化は将来）。
  $("share").textContent = cardText("daily", {
    streakDays: progress.streakDays(),
    todayMinutes: progress.todayMinutes(),
    weeklyMinutes: 0,
  });
  renderStats();
}

function sourceText(p: Problem): string {
  return p.source.type === "original"
    ? `出典: ${p.source.citation ?? "DENKEN-OS オリジナル問題"}`
    : `出典: ${p.source.citation}`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

async function main(): Promise<void> {
  $("next").onclick = renderQuestion;
  try {
    const res = await fetch("./problems.json");
    problems = (await res.json()) as Problem[];
  } catch {
    problems = [];
  }
  renderStats();
  renderQuestion();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
}

main();
