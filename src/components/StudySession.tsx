"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Card } from "ts-fsrs";
import type { Problem } from "@/domain/content/schema";
import { SUBJECT_LABELS } from "@/domain/content/schema";
import type { Confidence } from "@/domain/progress/store";
import {
  GRADE_LABELS,
  newCard,
  preview,
  type Grade4,
} from "@/domain/srs/scheduler";
import { xpForReview } from "@/domain/gamification/xp";
import {
  shouldRecommendBreak,
  BREAK_RECOMMEND_AFTER_MIN,
} from "@/domain/gamification/break";
import { MarkdownMath } from "@/components/MarkdownMath";

export interface StudySessionProps {
  queue: Problem[];
  onGrade: (
    problemId: string,
    grade: Grade4,
    correct: boolean,
    confidence?: Confidence,
  ) => void;
  /**
   * 指定された問題の現在 FSRS カードを返すコールバック。
   * 渡すと評価ボタンに「次回 ◯日後」を表示する(任意)。
   */
  getCard?: (problemId: string) => Card | null;
  /** 自信度トラッキング ON のとき、解答前に低/中/高を選択させる(任意)。 */
  confidenceTracking?: boolean;
}

const CONFIDENCE_LABELS: Record<Confidence, string> = {
  0: "知らない",
  1: "曖昧",
  2: "知ってる",
};

// 正答時に提示する評価。誤答時は常に "again"(FSRS の lapse)に固定する。
const CORRECT_GRADES: Grade4[] = ["hard", "good", "easy"];

export function StudySession({
  queue,
  onGrade,
  getCard,
  confidenceTracking = false,
}: StudySessionProps) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [confidence, setConfidence] = useState<Confidence | null>(null);
  // セッション開始時刻はマウント時に確定し、以後変更しない不変値。
  const [sessionStart] = useState(() => new Date());
  const [breakSnoozed, setBreakSnoozed] = useState(false);
  // wall-clock check every 30s for retrieval break
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const problem: Problem | undefined = queue[index];
  const revealed = selected !== null;
  const isCorrect = problem != null && selected === problem.answerIndex;
  const showBreakBanner =
    !revealed && !breakSnoozed && shouldRecommendBreak(sessionStart, now);

  // 評価ボタンに表示する「もし◯を選んだら次は◯日後」のプレビュー。
  const intervals = useMemo(() => {
    if (!problem || !revealed || !getCard) return null;
    const card = getCard(problem.id) ?? newCard();
    return preview(card);
  }, [problem, revealed, getCard]);

  function choose(i: number) {
    if (selected === null) setSelected(i);
  }

  function gradeAndNext(grade: Grade4) {
    if (!problem || selected === null) return;
    onGrade(problem.id, grade, isCorrect, confidence ?? undefined);
    setSelected(null);
    setConfidence(null);
    setIndex((i) => i + 1);
  }

  // キーボード操作: 未回答中は数字キーで選択肢、回答後は評価/次へ。
  useEffect(() => {
    if (!problem) return;
    function onKey(e: KeyboardEvent) {
      if (!problem) return;
      if (selected === null) {
        const n = Number(e.key);
        if (Number.isInteger(n) && n >= 1 && n <= problem.choices.length) {
          choose(n - 1);
        }
        return;
      }
      if (isCorrect) {
        const map: Record<string, Grade4> = { "1": "hard", "2": "good", "3": "easy" };
        if (map[e.key]) gradeAndNext(map[e.key]);
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        gradeAndNext("again");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, selected, isCorrect, problem]);

  if (queue.length === 0) {
    return (
      <Empty
        title="今日の復習は完了しています 🎉"
        body="復習期限が来ている問題はありません。期限が来ると再びここに表示されます。"
      />
    );
  }

  if (!problem) {
    return (
      <Empty
        title={`セッション完了 — ${queue.length} 問を学習しました 🎉`}
        body="お疲れさまでした。FSRS が各問題の次回復習日を自動で設定しました。"
      />
    );
  }

  return (
    <div className="space-y-6">
      {showBreakBanner && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span>
            🍵 {BREAK_RECOMMEND_AFTER_MIN} 分以上集中しました。短い休憩を挟むと
            記憶定着率が上がります(retrieval break)。
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setBreakSnoozed(true)}
              className="rounded-md border border-amber-300 bg-white px-3 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100"
            >
              続ける
            </button>
            <Link
              href="/"
              className="rounded-md bg-amber-700 px-3 py-1 text-xs font-medium text-white hover:bg-amber-800"
            >
              休憩する
            </Link>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span aria-live="polite">
          {index + 1} / {queue.length}
        </span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
          {SUBJECT_LABELS[problem.subject]} ・ {problem.topic} ・ 難易度{" "}
          {problem.difficulty}
        </span>
      </div>

      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={queue.length}
        aria-valuenow={index}
      >
        <div
          className="h-full rounded-full bg-indigo-500 transition-all"
          style={{ width: `${(index / queue.length) * 100}%` }}
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <MarkdownMath>{problem.question}</MarkdownMath>
      </div>

      {confidenceTracking && !revealed && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="mb-2 text-xs text-slate-500">
            解答前の自信度を選んでください(メタ認知の校正に使います、任意)
          </p>
          <div className="flex gap-2">
            {([0, 1, 2] as Confidence[]).map((c) => (
              <button
                key={c}
                onClick={() => setConfidence(c)}
                className={`flex-1 rounded-md border px-3 py-1.5 text-xs font-medium transition ${
                  confidence === c
                    ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                    : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300"
                }`}
              >
                {CONFIDENCE_LABELS[c]}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        {!revealed && (
          <p className="text-xs text-slate-400">
            数字キー(1〜{problem.choices.length})でも選べます
          </p>
        )}
        {problem.choices.map((choice, i) => {
          const state = !revealed
            ? "idle"
            : i === problem.answerIndex
              ? "correct"
              : i === selected
                ? "wrong"
                : "muted";
          return (
            <button
              key={i}
              onClick={() => choose(i)}
              disabled={revealed}
              aria-keyshortcuts={String(i + 1)}
              className={[
                "flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition",
                state === "idle" &&
                  "border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50",
                state === "correct" && "border-emerald-400 bg-emerald-50",
                state === "wrong" && "border-rose-400 bg-rose-50",
                state === "muted" && "border-slate-200 bg-white opacity-60",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-300 text-xs font-semibold text-slate-500">
                {String.fromCharCode(65 + i)}
              </span>
              <span className="markdown">
                <MarkdownMath>{choice}</MarkdownMath>
              </span>
            </button>
          );
        })}
      </div>

      {revealed && (
        <div className="space-y-4">
          <div
            className={`rounded-xl border p-5 ${
              isCorrect
                ? "border-emerald-200 bg-emerald-50"
                : "border-rose-200 bg-rose-50"
            }`}
          >
            <p
              className={`mb-2 font-semibold ${
                isCorrect ? "text-emerald-700" : "text-rose-700"
              }`}
            >
              <span>{isCorrect ? "正解" : "不正解"}</span>
              {isCorrect && (
                <span className="ml-2 text-xs font-medium text-emerald-600">
                  +{xpForReview(problem, true)} XP
                </span>
              )}
            </p>
            <MarkdownMath>{problem.explanation}</MarkdownMath>
          </div>

          {isCorrect ? (
            <div>
              <p className="mb-2 text-sm text-slate-500">
                記憶の定着度を選んでください(次回の出題間隔が決まります):
              </p>
              <div className="grid grid-cols-3 gap-2">
                {CORRECT_GRADES.map((g, i) => (
                  <button
                    key={g}
                    onClick={() => gradeAndNext(g)}
                    aria-keyshortcuts={String(i + 1)}
                    className="flex flex-col items-center rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50"
                  >
                    <span>{GRADE_LABELS[g]}</span>
                    {intervals && (
                      <span className="mt-0.5 text-xs font-normal text-slate-400">
                        {intervals[g].intervalLabel}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <button
              onClick={() => gradeAndNext("again")}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white transition hover:bg-indigo-700"
            >
              次の問題へ
              {intervals && (
                <span className="ml-2 text-xs font-normal text-indigo-100">
                  ({intervals.again.intervalLabel}に再出題)
                </span>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
      <h1 className="text-xl font-bold">{title}</h1>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">{body}</p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-lg bg-indigo-600 px-5 py-2.5 font-semibold text-white transition hover:bg-indigo-700"
      >
        ダッシュボードへ
      </Link>
    </div>
  );
}
