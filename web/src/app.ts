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
import { consecutiveFailures, intervention } from "../../lib/scheduler/intervention.js";
import { cardText } from "../../lib/share-card/card-text.js";
import { isAnswerCorrect } from "./grade.js";
import { dueSummary } from "./queue.js";
import { pickNextProblem } from "./select.js";
import { LocalProgress } from "./store.js";

function weakTopics(): string[] {
  // スケジューラの実 due を渡し、「最近やった＝過去」で overdue が逆転する不具合を防ぐ（SCHED-2）。
  const dueByTopic = new Map([...progress.allReviews()].map(([topic, rs]) => [topic, rs.dueMs]));
  return weakestTopics(aggregateByTopic(progress.logs(), dueByTopic).values(), Date.now(), 3);
}

const progress = new LocalProgress(window.localStorage);
let problems: Problem[] = [];
let current: Problem | null = null;
let questionShownAt = 0;

const $ = (id: string) => document.getElementById(id)!;

function pickNext(): Problem | null {
  // 弱点優先＋直近問題回避＋直近 topic の連発抑制(interleaving)。
  const recentTopics = progress
    .logs()
    .slice(-3)
    .map((l) => l.topic);
  return pickNextProblem(problems, { weakTopics: weakTopics(), excludeId: current?.id, recentTopics });
}

function renderStats(): void {
  const streak = progress.streakDays();
  // 本日の復習キュー（セッションのゴール提示。PEDX-06）。
  const { dueNow, overdue } = dueSummary(progress.allReviews(), Date.now());
  const dueLabel = dueNow > 0 ? `📚 復習 ${dueNow}件${overdue > 0 ? `（超過${overdue}）` : ""}` : "📚 ノルマ達成 ✅";
  $("streak").textContent = `🔥 連続 ${streak} 日 ・ ${dueLabel}`;
  const weak = weakTopics();
  $("weak").textContent = weak.length > 0 ? `弱点: ${weak.join(" / ")}` : "弱点: （まだデータなし）";
}

function renderQuestion(): void {
  current = pickNext();
  $("feedback").textContent = "";
  $("solution").innerHTML = "";
  $("share").textContent = "";
  if (!current) {
    $("statement").textContent = "問題が読み込めませんでした。";
    return;
  }
  questionShownAt = Date.now();
  const p = current;
  $("meta").textContent = `${p.topic}・難易度${"★".repeat(p.difficulty)}`;
  $("statement").textContent = p.statement;

  const answers = $("answers");
  answers.innerHTML = "";
  // 解答群を支援技術へ「ひとまとまりの操作群」として伝える（WCAG 4.1.2 / 1.3.1）。
  answers.setAttribute("role", "group");
  answers.setAttribute(
    "aria-label",
    p.choices && p.choices.length > 0 ? "選択肢" : p.format === "descriptive" ? "記述解答" : "数値解答",
  );
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
    // numeric: 入力欄（Enter でも回答できる）
    const input = document.createElement("input");
    input.id = "numeric-input";
    input.inputMode = "decimal";
    input.placeholder = "答えを入力";
    input.onkeydown = (e) => {
      if (e.key === "Enter") grade(input.value);
    };
    const btn = document.createElement("button");
    btn.className = "choice";
    btn.textContent = "回答";
    btn.onclick = () => grade(input.value);
    answers.appendChild(input);
    answers.appendChild(btn);
  }
}

function showSolution(p: Problem): void {
  $("solution").innerHTML =
    `<strong>模範解答</strong><ol>${p.solution.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ol><p class="src">${escapeHtml(sourceText(p))}</p>`;
}

function grade(given: string): void {
  if (!current) return;
  const p = current;
  const correct = isAnswerCorrect(p, given);
  const timeMs = Date.now() - questionShownAt;
  progress.record(p.topic, correct, Date.now(), timeMs, p.id);

  // 連続誤答の介入（負ループ抑制。D6）。同 topic を続けて外したら励まし/基礎回帰を促す。
  const fails = correct ? 0 : consecutiveFailures(progress.logs(), p.topic);
  const act = intervention(fails);
  const note =
    act === "ease_down"
      ? `（${p.topic}が${fails}回連続。基礎に戻って解説をじっくり確認しよう）`
      : act === "force_explanation"
        ? "（もう一度、解説の手順を一つずつ追ってみよう）"
        : "";
  $("feedback").textContent = (correct ? "⭕ 正解！" : `❌ 不正解（正解: ${p.answer}）`) + note;
  $("feedback").className = correct ? "ok" : "ng";
  // 選んだ誤答が「なぜ間違いか」の言語化を先頭に出す（典型ミスの解説。E1）。
  const missReason = !correct ? p.distractors?.find((d) => d.choice === given)?.reason : undefined;
  const missHtml = missReason ? `<p class="src">💡 ${escapeHtml(missReason)}</p>` : "";
  $("solution").innerHTML =
    `${missHtml}<strong>解説</strong><ol>${p.solution.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ol><p class="src">${escapeHtml(sourceText(p))}</p>`;

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
  $("next").onclick = () => {
    renderQuestion();
    // キーボード/読み上げ利用者のため次問の最初の操作要素へフォーカスを移す（WCAG 2.4.3）。
    ($("answers").querySelector("button, input, textarea") as HTMLElement | null)?.focus();
  };
  try {
    const res = await fetch("./problems.json");
    if (!res.ok) throw new Error(`problems.json の取得に失敗（${res.status}）`);
    const data: unknown = await res.json();
    problems = Array.isArray(data) ? (data as Problem[]) : [];
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
