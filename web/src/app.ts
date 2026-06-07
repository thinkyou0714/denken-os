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
import { masteryEWMA } from "../../lib/scheduler/mastery.js";
import { prioritizeFoundationFirst } from "../../lib/scheduler/prereq.js";
import { cardText } from "../../lib/share-card/card-text.js";
import { nextAttemptState } from "./attempt.js";
import { feedbackParts, isAnswerCorrect } from "./grade.js";
import { openKv } from "./idb.js";
import { IdbBackedStorage } from "./idb-storage.js";
import { mathToSpeech } from "./math-speech.js";
import { shouldRequestPersist } from "./persist.js";
import { dueSummary } from "./queue.js";
import { pickNextProblem } from "./select.js";
import { LocalProgress } from "./store.js";

/** topic → subject（読み込んだ問題から逆引き）。前提科目順(D3)に使う。 */
function subjectOf(topic: string): string | undefined {
  return problems.find((p) => p.topic === topic)?.subject;
}

const GRADUATED_MASTERY = 0.85; // D12: これ以上の習熟は卒業（弱点から外す）。

function weakTopics(): string[] {
  const logs = progress.logs();
  // スケジューラの実 due を渡し、「最近やった＝過去」で overdue が逆転する不具合を防ぐ（SCHED-2）。
  const dueByTopic = new Map([...progress.allReviews()].map(([topic, rs]) => [topic, rs.dueMs]));
  const raw = weakestTopics(aggregateByTopic(logs, dueByTopic).values(), Date.now(), 5);
  // 卒業済(高 mastery)を除外し再浮上を防ぐ（D12）→ 前提科目(理論)を優先（D3）→ 上位3。
  const active = raw.filter((t) => masteryEWMA(logs, t) < GRADUATED_MASTERY);
  return prioritizeFoundationFirst(active, subjectOf).slice(0, 3);
}

// 進捗ストア。main() で IndexedDB を hydrate してから生成する（不可なら localStorage フォールバック）。
let progress!: LocalProgress;
/** IndexedDB を使えた場合のみ保持。pagehide 時の flush（取りこぼし軽減）に使う。 */
let idbStorage: IdbBackedStorage | null = null;
let problems: Problem[] = [];
let current: Problem | null = null;
let questionShownAt = 0;
let attemptNo = 0; // 現在の問題への挑戦回数（PEDX-01: 初回誤答は reveal せず再挑戦）。

const $ = (id: string) => document.getElementById(id)!;

function pickNext(): Problem | null {
  // relearning(外した問題の再出題)優先 ＋ 弱点優先 ＋ 直近回避 ＋ topic 連発抑制(interleaving)。
  const recentTopics = progress
    .logs()
    .slice(-3)
    .map((l) => l.topic);
  return pickNextProblem(problems, {
    weakTopics: weakTopics(),
    excludeId: current?.id,
    recentTopics,
    lapsedDueIds: progress.dueLapses(),
  });
}

function renderStats(): void {
  const streak = progress.streakDays();
  // 本日の復習キュー（セッションのゴール提示。PEDX-06）。
  const { dueNow, overdue } = dueSummary(progress.allReviews(), Date.now());
  const dueLabel = dueNow > 0 ? `📚 復習 ${dueNow}件${overdue > 0 ? `（超過${overdue}）` : ""}` : "📚 ノルマ達成 ✅";
  // 克服(卒業)した topic 数を進捗の物語として見せる（D12）。
  const logs = progress.logs();
  const graduated = [...new Set(logs.map((l) => l.topic))].filter(
    (t) => masteryEWMA(logs, t) >= GRADUATED_MASTERY,
  ).length;
  const gradLabel = graduated > 0 ? ` ・ 🎓 克服 ${graduated}` : "";
  $("streak").textContent = `🔥 連続 ${streak} 日 ・ ${dueLabel}${gradLabel}`;
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
  attemptNo = 0;
  const p = current;
  $("meta").textContent = `${p.topic}・難易度${"★".repeat(p.difficulty)}`;
  $("statement").textContent = p.statement;
  // 数式記号をスクリーンリーダ向けに読み下す（視覚表示は維持。A1）。
  $("statement").setAttribute("aria-label", mathToSpeech(p.statement));

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
      btn.setAttribute("aria-label", mathToSpeech(choice)); // 選択肢も読み下す（A1）。
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
  attemptNo += 1;
  const correctThis = isAnswerCorrect(p, given);
  const outcome = nextAttemptState({ format: p.format, correct: correctThis, attemptNo });

  // PEDX-01: 初回誤答(択一/数値)は解説を出さず、もう一度想起させる（record はまだ呼ばない）。
  if (outcome.kind === "retry") {
    $("feedback").textContent = "❌ もう一度考えてみよう（残り1回）";
    $("feedback").className = "ng";
    return;
  }

  const correct = outcome.correct;
  const timeMs = Date.now() - questionShownAt;
  // reveal 時に最終結果で1回だけ記録（二重計上を防ぐ）。
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
  // 視覚記号(aria-hidden)と読み上げ文(visually-hidden)を分離（A3）。
  const fb = feedbackParts(correct, p.answer);
  $("feedback").innerHTML =
    `<span aria-hidden="true">${escapeHtml(fb.visual + note)}</span>` +
    `<span class="visually-hidden">${escapeHtml(fb.speech + note)}</span>`;
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

/** IndexedDB 永続化を優先し、不可なら localStorage にフォールバックして進捗ストアを作る。 */
async function createProgress(): Promise<LocalProgress> {
  try {
    const kv = await openKv("denken-os", "kv");
    const storage = new IdbBackedStorage(kv, { migrationSource: window.localStorage });
    await storage.hydrate(); // 既存 localStorage を一度だけ移行 + 版数 stamp
    idbStorage = storage;
    return new LocalProgress(storage);
  } catch {
    // IndexedDB 不可（Safari private 等）: localStorage 直結で従来動作。
    return new LocalProgress(window.localStorage);
  }
}

async function main(): Promise<void> {
  // 永続層を先に用意（同期読み取り API を満たした状態で以降の render が走る）。
  progress = await createProgress();
  // タブ離脱時に未完了の write-through を待つ（IndexedDB 使用時のみ。fallback では no-op）。
  addEventListener("pagehide", () => void idbStorage?.flush());
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
  setupBackup();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }

  // 学習記録を eviction から守る（意味あるデータがある時だけ persist を要求。persistent-storage）。
  if (navigator.storage?.persist && navigator.storage?.persisted) {
    navigator.storage
      .persisted()
      .then((persisted) => {
        const hasMeaningfulData = progress.logs().length > 0 || progress.streakDays() > 0;
        if (shouldRequestPersist({ persisted, hasMeaningfulData })) void navigator.storage.persist();
      })
      .catch(() => {});
  }
}

/** 学習データの書き出し/取り込み UI（端末移行・バックアップ。export-import）。 */
function setupBackup(): void {
  $("export-btn").onclick = () => {
    const blob = new Blob([progress.exportData()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `denken-os-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  $("import-btn").onclick = () => ($("import-file") as HTMLInputElement).click();
  ($("import-file") as HTMLInputElement).onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    file.text().then((txt) => {
      const ok = progress.importData(txt);
      renderStats();
      $("feedback").textContent = ok ? "✅ バックアップを取り込みました" : "❌ ファイルが不正です";
      $("feedback").className = ok ? "ok" : "ng";
    });
  };
}

main();
