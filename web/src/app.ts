/**
 * app.ts — オフライン学習アプリ MVP のエントリ。
 * 仕様(成長ループ ②Aha/③継続)を最小実装:
 *  - 弱点 topic を優先して出題（lib/scheduler の診断）
 *  - 解答→即フィードバック＋解説、SM-2 で記憶状態を更新（localStorage 永続）
 *  - 連続日数・弱点・シェアテキストを表示
 * バックエンド不要・完全オフライン（Service Worker で app shell をキャッシュ）。
 */

import { buildPlaylist, type PlaylistOptions, playlistTranscript, sessionSummaryText } from "../../lib/audio/script.js";
import type { Problem, Subject } from "../../lib/engine/schema.js";
import { aggregateByTopic, weakestTopics } from "../../lib/scheduler/diagnosis.js";
import { cardText } from "../../lib/share-card/card-text.js";
import { buildLesson, lessonFeedback, type QuizResult, summarizeLesson } from "../../lib/study/lesson.js";
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

function renderQuestion(forced?: Problem): void {
  current = forced ?? pickNext();
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

  // レッスンモード中なら採点結果をレッスンへ通知（聞く→解く→弱点ループ）。
  onGraded?.(p, correct);
}

/** レッスン（聞く→解く）の採点完了フック。通常モードでは null。 */
let onGraded: ((p: Problem, correct: boolean) => void) | null = null;

function sourceText(p: Problem): string {
  return p.source.type === "original"
    ? `出典: ${p.source.citation ?? "DENKEN-OS オリジナル問題"}`
    : `出典: ${p.source.citation}`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

let audioPlayer: AudioPlayer | null = null;

const AUDIO_PREFIX = "denken:audio:";

/** 設定UIを localStorage と同期する（次回起動時に復元）。 */
function bindPersisted(id: string, prop: "value" | "checked"): void {
  const el = $(id) as HTMLInputElement | HTMLSelectElement;
  const saved = window.localStorage.getItem(AUDIO_PREFIX + id);
  if (saved !== null) {
    if (prop === "checked") (el as HTMLInputElement).checked = saved === "true";
    else el.value = saved;
  }
  el.addEventListener("change", () => {
    const v = prop === "checked" ? String((el as HTMLInputElement).checked) : el.value;
    window.localStorage.setItem(AUDIO_PREFIX + id, v);
  });
}

/** 法規 聞き流しモードのUI配線。 */
function setupAudio(): void {
  const now = $("audio-now");
  const transcript = $("audio-transcript");
  const speechOk = isSpeechAvailable();

  // 設定を復元＋変更を永続化。
  for (const [id, prop] of [
    ["audio-loop", "checked"],
    ["audio-repeatans", "checked"],
    ["audio-resume", "checked"],
    ["audio-rate", "value"],
    ["audio-gap", "value"],
    ["audio-subject", "value"],
    ["audio-mode", "value"],
    ["audio-max", "value"],
    ["audio-maxmin", "value"],
  ] as const) {
    bindPersisted(id, prop);
  }

  const speaker = new BrowserSpeaker();

  const RESUME_KEY = "denken:audio:resumeIndex";

  // UI から現在の聞き流し設定を読み取る（再生・原稿書き出しで共有）。
  const readConfig = () => {
    const subjectVal = ($("audio-subject") as HTMLSelectElement).value;
    const mode = ($("audio-mode") as HTMLSelectElement).value;
    const dueTopics = mode === "due" ? progress.dueTopics() : mode === "wrong" ? progress.wrongTopics() : undefined;
    const playlistOpts: PlaylistOptions = {
      subjects: subjectVal ? [subjectVal as Subject] : undefined,
      weakTopics: weakTopics(),
      dueOnly: mode === "due" || mode === "wrong",
      dueTopics,
      interleave: true,
    };
    return {
      playlistOpts,
      rate: Number(($("audio-rate") as HTMLSelectElement).value) || 1,
      gapMs: Number(($("audio-gap") as HTMLSelectElement).value) || 6000,
      maxItems: Number(($("audio-max") as HTMLSelectElement).value) || 0,
      maxMin: Number(($("audio-maxmin") as HTMLSelectElement).value) || 0,
      loop: ($("audio-loop") as HTMLInputElement).checked,
      repeatAnswer: ($("audio-repeatans") as HTMLInputElement).checked,
      startIndex: ($("audio-resume") as HTMLInputElement).checked
        ? Number(window.localStorage.getItem(RESUME_KEY) ?? "0") || 0
        : 0,
    };
  };

  const build = (): AudioPlayer => {
    const cfg = readConfig();
    return new AudioPlayer(
      problems,
      speaker,
      {
        rate: cfg.rate,
        loop: cfg.loop,
        maxItems: cfg.maxItems > 0 ? cfg.maxItems : undefined,
        maxMs: cfg.maxMin > 0 ? cfg.maxMin * 60_000 : undefined,
        startIndex: cfg.startIndex,
        script: { includeSource: true, gapMs: cfg.gapMs, repeatAnswer: cfg.repeatAnswer },
        onSegment: ({ script, segmentIndex }) => {
          now.textContent = `▶ ${script.topic}（${script.problemId}）`;
          transcript.textContent = script.segments[segmentIndex]?.text ?? "";
          setMediaMetadata(script.topic, script.problemId);
        },
        onProblem: ({ problemIndex }) => {
          window.localStorage.setItem(RESUME_KEY, String(problemIndex + 1));
        },
        onComplete: ({ completed, played }) => {
          now.textContent = `再生が終了しました（${played}問）。`;
          transcript.textContent = "";
          // 末尾到達/タイマー終了時のみ締め要約を読み上げる（手動停止では出さない）。
          if (completed && played > 0) {
            void speaker.speak(sessionSummaryText({ count: played, weakTopics: weakTopics() }), { rate: cfg.rate });
          }
        },
      },
      cfg.playlistOpts,
    );
  };

  // 現在の設定で読み上げ原稿をクリップボードへ（聴覚補助・読み返し・学習ログ）。
  const copyTranscript = async (): Promise<void> => {
    const cfg = readConfig();
    const list = buildPlaylist(problems, cfg.playlistOpts);
    if (list.length === 0) {
      now.textContent = "原稿にする問題がありません。";
      return;
    }
    const text = playlistTranscript(list, { includeSource: true, gapMs: cfg.gapMs, repeatAnswer: cfg.repeatAnswer });
    try {
      await navigator.clipboard.writeText(text);
      now.textContent = `原稿（${list.length}問）をコピーしました。`;
    } catch {
      // クリップボード不可の環境では画面に表示してフォールバック。
      transcript.textContent = text;
      now.textContent = `原稿（${list.length}問）を下に表示しました。`;
    }
  };

  // 原稿コピーは音声合成が無くても使える（聴覚補助・no-TTS 端末対応）→ ガード前に配線。
  $("audio-transcript-btn").onclick = () => void copyTranscript();

  if (!speechOk) {
    $("audio-unsupported").textContent =
      "この端末/ブラウザは音声合成に未対応です。聞き流し再生は使えませんが、原稿コピーは利用できます。";
    for (const id of ["audio-play", "audio-pause", "audio-prev", "audio-repeat", "audio-next", "audio-stop"]) {
      ($(id) as HTMLButtonElement).disabled = true;
    }
    return;
  }

  // 「聞く→解く→弱点講評」レッスン: まず聞き、聞いた論点をそのまま解いて弱点へ還元する。
  const beginQuiz = (quiz: Problem[], rate: number): void => {
    const results: QuizResult[] = [];
    let idx = 0;
    now.textContent = `✍️ いま聞いた${quiz.length}問を解いてみましょう。`;
    void speaker.speak(`では、いま聞いた${quiz.length}問を解いてみましょう。`, { rate });
    onGraded = (p, correct) => {
      results.push({ topic: p.topic, subject: p.subject, correct });
      idx += 1;
      if (idx < quiz.length) {
        renderQuestion(quiz[idx]!);
      } else {
        onGraded = null;
        const summary = summarizeLesson(results);
        const fb = lessonFeedback(summary);
        now.textContent = `📊 ${fb}`;
        renderStats(); // 弱点表示を更新（次レッスンの対象が変わる）
        void speaker.speak(fb, { rate });
      }
    };
    if (quiz[0]) renderQuestion(quiz[0]);
  };

  const startLesson = (): void => {
    if (audioPlayer?.isPlaying) return;
    const cfg = readConfig();
    const count = cfg.maxItems > 0 ? cfg.maxItems : 5;
    const lesson = buildLesson(problems, {
      subjects: cfg.playlistOpts.subjects,
      weakTopics: weakTopics(),
      dueOnly: cfg.playlistOpts.dueOnly,
      dueTopics: cfg.playlistOpts.dueTopics,
      count,
    });
    if (lesson.listen.length === 0) {
      now.textContent = "レッスンにする問題がありません（科目/対象を変えてみてください）。";
      return;
    }
    now.textContent = `📚 レッスン開始：まず${lesson.listen.length}問を聞いてください。`;
    audioPlayer = new AudioPlayer(lesson.listen, speaker, {
      rate: cfg.rate,
      loop: false,
      script: { includeSource: false, gapMs: cfg.gapMs, repeatAnswer: cfg.repeatAnswer },
      onSegment: ({ script, segmentIndex }) => {
        now.textContent = `🎧 ${script.topic}（${script.problemId}）`;
        transcript.textContent = script.segments[segmentIndex]?.text ?? "";
        setMediaMetadata(script.topic, script.problemId);
      },
      onComplete: ({ completed }) => {
        transcript.textContent = "";
        if (completed) beginQuiz(lesson.quiz, cfg.rate);
        else now.textContent = "レッスンを中断しました。";
      },
    });
    void audioPlayer.start();
  };

  const play = (): void => {
    if (audioPlayer?.isPlaying) {
      if (audioPlayer.isPaused) audioPlayer.resume();
      return;
    }
    audioPlayer = build();
    if (audioPlayer.length === 0) {
      now.textContent = "対象の問題がありません（科目を変えてみてください）。";
      return;
    }
    void audioPlayer.start();
  };
  const togglePause = (): void => {
    if (!audioPlayer?.isPlaying) {
      play();
      return;
    }
    if (audioPlayer.isPaused) audioPlayer.resume();
    else audioPlayer.pause();
  };

  $("audio-lesson").onclick = startLesson;
  $("audio-play").onclick = play;
  $("audio-pause").onclick = togglePause;
  $("audio-prev").onclick = () => audioPlayer?.prev();
  $("audio-repeat").onclick = () => audioPlayer?.repeat();
  $("audio-next").onclick = () => audioPlayer?.next();
  $("audio-stop").onclick = () => {
    audioPlayer?.stop();
    now.textContent = "停止しました。";
    transcript.textContent = "";
  };

  setupMediaSession({ play, pause: togglePause, next: () => audioPlayer?.next(), prev: () => audioPlayer?.prev() });

  // キーボードショートカット（入力欄にフォーカスが無いときのみ）。
  document.addEventListener("keydown", (e) => {
    const tag = (document.activeElement?.tagName ?? "").toLowerCase();
    if (tag === "input" || tag === "select" || tag === "textarea") return;
    if (e.key === " ") {
      e.preventDefault();
      togglePause();
    } else if (e.key.toLowerCase() === "n") {
      audioPlayer?.next();
    } else if (e.key.toLowerCase() === "p") {
      audioPlayer?.prev();
    } else if (e.key.toLowerCase() === "r") {
      audioPlayer?.repeat();
    }
  });
}

/** ロック画面/メディアキー連携（対応端末のみ）。 */
function setupMediaSession(actions: { play: () => void; pause: () => void; next: () => void; prev: () => void }): void {
  const ms = (navigator as Navigator & { mediaSession?: MediaSession }).mediaSession;
  if (!ms) return;
  try {
    ms.setActionHandler("play", actions.play);
    ms.setActionHandler("pause", actions.pause);
    ms.setActionHandler("nexttrack", actions.next);
    ms.setActionHandler("previoustrack", actions.prev);
  } catch {
    // 一部アクション未対応でも致命的でない。
  }
}

function setMediaMetadata(topic: string, id: string): void {
  const w = window as Window & { MediaMetadata?: typeof MediaMetadata };
  const ms = (navigator as Navigator & { mediaSession?: MediaSession }).mediaSession;
  if (!ms || !w.MediaMetadata) return;
  ms.metadata = new w.MediaMetadata({ title: `${topic}（${id}）`, artist: "DENKEN-OS 法規 聞き流し" });
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
