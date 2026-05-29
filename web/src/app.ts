/**
 * app.ts — オフライン学習アプリ MVP のエントリ。
 * 仕様(成長ループ ②Aha/③継続)を最小実装:
 *  - 弱点 topic を優先して出題（lib/scheduler の診断）
 *  - 解答→即フィードバック＋解説、SM-2 で記憶状態を更新（localStorage 永続）
 *  - 連続日数・弱点・シェアテキストを表示
 * バックエンド不要・完全オフライン（Service Worker で app shell をキャッシュ）。
 */

import { buildPlaylist, type PlaylistOptions, playlistTranscript, sessionSummaryText } from "../../lib/audio/script.js";
import type { Problem, RubricItem, Subject } from "../../lib/engine/schema.js";
import { aggregateByTopic, weakestTopics } from "../../lib/scheduler/diagnosis.js";
import { cardText } from "../../lib/share-card/card-text.js";
import { planExam } from "../../lib/study/exam-plan.js";
import {
  buildLesson,
  lessonFeedback,
  passReadiness,
  type QuizResult,
  summarizeLesson,
} from "../../lib/study/lesson.js";
import { aspectReadiness, keywordHits, type RubricMark, rubricFeedback, scoreRubric } from "../../lib/study/rubric.js";
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
  renderReadiness();
  renderAspects();
}

/** 記述採点の観点別到達度（立式/計算/単位/論述/作図）を表示する。 */
function renderAspects(): void {
  const el = document.getElementById("aspects");
  if (!el) return;
  const ready = aspectReadiness(progress.aspectTotals());
  if (ready.length === 0) {
    el.textContent = "";
    return;
  }
  el.innerHTML = `<span class="rd-label">記述の観点別</span>${ready
    .map((a) => {
      const pct = Math.round(a.ratio * 100);
      const mark = !a.enoughData ? "⏳" : a.onTrack ? "✅" : "⚠️";
      return `<span class="rd">${mark} ${escapeHtml(a.aspect)} ${pct}%</span>`;
    })
    .join("")}`;
}

/** 科目別の合格到達度（60%ライン）を表示する。科目合格制の資源配分を支援。 */
function renderReadiness(): void {
  const el = document.getElementById("readiness");
  if (!el) return;
  const ready = passReadiness(progress.subjectAccuracy());
  if (ready.length === 0) {
    el.textContent = "科目別合格到達度: （問題を解くと表示されます）";
    return;
  }
  el.innerHTML = ready
    .map((r) => {
      const pct = Math.round(r.accuracy * 100);
      const mark = !r.enoughData ? "⏳" : r.onTrack ? "✅" : "⚠️";
      const note = !r.enoughData ? "（データ不足）" : r.onTrack ? "合格圏" : "要強化";
      return `<span class="rd">${mark} ${escapeHtml(r.subject)} ${pct}% ${note}</span>`;
    })
    .join("");
  renderExamPlan();
}

/** 試験日からの合格逆算ペース（今日の目標・重点科目）を表示する。 */
function renderExamPlan(): void {
  const el = document.getElementById("exam-plan");
  if (!el) return;
  const examMs = progress.examDateMs();
  if (!examMs) {
    el.textContent = "試験日を設定すると、合格逆算で今日の目標を表示します。";
    return;
  }
  const plan = planExam({ examMs, nowMs: Date.now(), readiness: passReadiness(progress.subjectAccuracy()) });
  const doneToday = progress.todayAnswered();
  const progressText =
    plan.todayTarget > 0 ? `（今日 ${Math.min(doneToday, plan.todayTarget)}/${plan.todayTarget}問）` : "";
  el.textContent = `${plan.message}${progressText}`;
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
    renderDescriptive(p, answers);
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

/**
 * 記述式(二次)の出題: ①自分の解答を入力 → ②模範解答と並置 →
 * ③ルーブリック項目を◯△✕で自己採点 → ④得点率と弱点観点。
 * rubric が無い問題は従来の二択自己採点に劣化対応する。
 */
function renderDescriptive(p: Problem, answers: HTMLElement): void {
  const input = document.createElement("textarea");
  input.id = "desc-input";
  input.rows = 4;
  input.placeholder = "自分の解答・方針を書いてから模範解答を表示（先に書くほど身につきます）";
  input.style.width = "100%";
  answers.appendChild(input);

  const reveal = document.createElement("button");
  reveal.className = "choice";
  reveal.textContent = "模範解答を表示して採点へ";
  reveal.onclick = () => {
    showSolution(p);
    answers.innerHTML = "";
    if (p.rubric && p.rubric.length > 0) {
      renderRubricScoring(p, p.rubric, input.value, answers);
    } else {
      // 旧来の二択自己採点（rubric 未設定問題の後方互換）。
      const ok = document.createElement("button");
      ok.className = "choice";
      ok.textContent = "✅ 自分の解答で書けた";
      ok.onclick = () => grade(p.answer);
      const ng = document.createElement("button");
      ng.className = "choice";
      ng.textContent = "❌ 書けなかった";
      ng.onclick = () => grade("__self_incorrect__");
      answers.appendChild(ok);
      answers.appendChild(ng);
    }
  };
  answers.appendChild(reveal);
}

/** ルーブリック項目ごとに満点/部分/未達を選び、採点ボタンで集計する。 */
function renderRubricScoring(p: Problem, rubric: RubricItem[], answerText: string, answers: HTMLElement): void {
  const marks = new Map<string, RubricMark>();
  const hits = keywordHits(rubric, answerText);
  const hitById = new Map(hits.map((h) => [h.id, h]));

  const wrap = document.createElement("div");
  wrap.className = "rubric";
  for (const item of rubric) {
    const row = document.createElement("div");
    row.className = "rubric-row";
    const req = item.required ? ' <span class="req">必須</span>' : "";
    const hit = hitById.get(item.id);
    const hintText = hit && hit.total > 0 ? `（キーワード ${hit.hit}/${hit.total}）` : "";
    const label = document.createElement("div");
    label.innerHTML = `<b>${item.points}点</b> ${escapeHtml(item.criterion)}${req} <span class="hint">${escapeHtml(hintText)}</span>`;
    row.appendChild(label);

    const group = document.createElement("div");
    group.className = "rubric-marks";
    for (const [mark, text] of [
      ["full", "◯ 満点"],
      ["partial", "△ 部分"],
      ["none", "✕ 未達"],
    ] as const) {
      const b = document.createElement("button");
      b.className = "mark";
      b.textContent = text;
      b.onclick = () => {
        marks.set(item.id, mark);
        for (const sib of group.querySelectorAll("button")) sib.classList.remove("sel");
        b.classList.add("sel");
      };
      group.appendChild(b);
    }
    row.appendChild(group);
    wrap.appendChild(row);
  }
  answers.appendChild(wrap);

  const submit = document.createElement("button");
  submit.className = "choice";
  submit.textContent = "採点する";
  submit.onclick = () => {
    const score = scoreRubric(
      rubric,
      [...marks.entries()].map(([id, mark]) => ({ id, mark })),
    );
    $("feedback").textContent = `📝 ${rubricFeedback(score)}`;
    $("feedback").className = score.passed ? "ok" : "ng";
    // 観点別(立式/計算/論述…)の累積へ記録（記述特有の弱点軸を可視化）。
    progress.recordRubric(score);
    // 合格ライン到達を正誤として記録（弱点ループ・科目別到達度に接続）。
    grade(score.passed ? p.answer : "__self_incorrect__", { silentFeedback: true });
    renderAspects();
  };
  answers.appendChild(submit);
}

function grade(given: string, opts: { silentFeedback?: boolean } = {}): void {
  if (!current) return;
  const p = current;
  const correct = given === p.answer;
  const timeMs = Date.now() - questionShownAt;
  progress.record(p.topic, correct, Date.now(), timeMs, p.subject);

  // ルーブリック採点時は呼び出し側が講評を出すので、ここでは上書きしない。
  if (!opts.silentFeedback) {
    $("feedback").textContent = correct ? "⭕ 正解！" : `❌ 不正解（正解: ${p.answer}）`;
    $("feedback").className = correct ? "ok" : "ng";
  }
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

function setupExamDate(): void {
  const input = document.getElementById("exam-date") as HTMLInputElement | null;
  if (!input) return;
  // 保存済みの試験日を YYYY-MM-DD 形式で復元。
  const ms = progress.examDateMs();
  if (ms) {
    const d = new Date(ms);
    input.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  input.addEventListener("change", () => {
    progress.setExamDate(input.value);
    renderExamPlan();
  });
}

async function main(): Promise<void> {
  $("next").onclick = () => renderQuestion();
  try {
    const res = await fetch("./problems.json");
    problems = (await res.json()) as Problem[];
  } catch {
    problems = [];
  }
  setupExamDate();
  renderStats();
  renderQuestion();
  setupAudio();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
}

main();
