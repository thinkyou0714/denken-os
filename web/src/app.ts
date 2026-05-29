/**
 * app.ts — オフライン学習アプリ MVP のエントリ。
 * 仕様(成長ループ ②Aha/③継続)を最小実装:
 *  - 弱点 topic を優先して出題（lib/scheduler の診断）
 *  - 解答→即フィードバック＋解説、SM-2 で記憶状態を更新（localStorage 永続）
 *  - 連続日数・弱点・シェアテキストを表示
 * バックエンド不要・完全オフライン（Service Worker で app shell をキャッシュ）。
 */
import type { Problem, Subject } from "../../lib/engine/schema.js";
import { aggregateByTopic, weakestTopics } from "../../lib/scheduler/diagnosis.js";
import { cardText } from "../../lib/share-card/card-text.js";
import { AudioPlayer } from "./audio-player.js";
import { BrowserSpeaker, isSpeechAvailable } from "./browser-speaker.js";
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

function showSolution(p: Problem): void {
  $("solution").innerHTML =
    `<strong>模範解答</strong><ol>${p.solution.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ol><p class="src">${escapeHtml(sourceText(p))}</p>`;
}

function grade(given: string): void {
  if (!current) return;
  const p = current;
  const correct = given === p.answer;
  const timeMs = Date.now() - questionShownAt;
  progress.record(p.topic, correct, Date.now(), timeMs);

  $("feedback").textContent = correct ? "⭕ 正解！" : `❌ 不正解（正解: ${p.answer}）`;
  $("feedback").className = correct ? "ok" : "ng";
  $("solution").innerHTML =
    `<strong>解説</strong><ol>${p.solution.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ol><p class="src">${escapeHtml(sourceText(p))}</p>`;

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

let audioPlayer: AudioPlayer | null = null;

/** 法規 聞き流しモードのUI配線。 */
function setupAudio(): void {
  const now = $("audio-now");
  if (!isSpeechAvailable()) {
    $("audio-unsupported").textContent = "この端末/ブラウザは音声合成に未対応のため、聞き流しは利用できません。";
    for (const id of ["audio-play", "audio-next", "audio-stop"]) {
      ($(id) as HTMLButtonElement).disabled = true;
    }
    return;
  }

  const speaker = new BrowserSpeaker();

  const build = (): AudioPlayer => {
    const subjectVal = ($("audio-subject") as HTMLSelectElement).value;
    const subjects = subjectVal ? [subjectVal as Subject] : undefined;
    const rate = Number(($("audio-rate") as HTMLSelectElement).value) || 1;
    const loop = ($("audio-loop") as HTMLInputElement).checked;
    return new AudioPlayer(
      problems,
      speaker,
      {
        rate,
        loop,
        script: { includeSource: true },
        onSegment: ({ script }) => {
          now.textContent = `▶ ${script.topic}（${script.problemId}）`;
        },
      },
      { subjects, weakTopics: weakTopics() },
    );
  };

  $("audio-play").onclick = () => {
    if (audioPlayer?.isPlaying) return;
    audioPlayer = build();
    if (audioPlayer.length === 0) {
      now.textContent = "対象の問題がありません（科目を変えてみてください）。";
      return;
    }
    void audioPlayer.start().then(() => {
      if (!audioPlayer?.isPlaying) now.textContent = "再生が終了しました。";
    });
  };
  $("audio-next").onclick = () => audioPlayer?.next();
  $("audio-stop").onclick = () => {
    audioPlayer?.stop();
    now.textContent = "停止しました。";
  };
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
  setupAudio();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
}

main();
