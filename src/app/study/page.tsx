"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useProgress } from "@/lib/useProgress";
import { problems } from "@/data/problems";
import { buildQueue } from "@/domain/srs/diagnosis";
import { GRADE_LABELS, type Grade4 } from "@/domain/srs/scheduler";
import { SUBJECT_LABELS } from "@/domain/content/schema";
import { MarkdownMath } from "@/components/MarkdownMath";

export default function StudyPage() {
  const { store, record, mounted } = useProgress();

  // セッション開始時点のキューを固定(解答で再計算されて順序が乱れないように)。
  const queue = useMemo(() => {
    if (!mounted) return [];
    return buildQueue(problems, store, new Date(), 20);
  }, [mounted, store]);

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [done, setDone] = useState(0);

  if (!mounted) return <p className="text-slate-500">読み込み中…</p>;

  if (queue.length === 0) {
    return (
      <Empty
        title="今日の復習は完了しています 🎉"
        body="復習期限が来ている問題はありません。期限が来ると再びここに表示されます。"
      />
    );
  }

  if (index >= queue.length) {
    return (
      <Empty
        title={`セッション完了 — ${done} 問を学習しました 🎉`}
        body="お疲れさまでした。FSRS が各問題の次回復習日を自動で設定しました。"
      />
    );
  }

  const problem = queue[index];
  const revealed = selected !== null;
  const isCorrect = selected === problem.answerIndex;

  function choose(i: number) {
    if (selected === null) setSelected(i);
  }

  function grade(g: Grade4) {
    record(problem.id, g, isCorrect);
    setSelected(null);
    setDone((d) => d + 1);
    setIndex((i) => i + 1);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>
          {index + 1} / {queue.length}
        </span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
          {SUBJECT_LABELS[problem.subject]} ・ {problem.topic} ・ 難易度{" "}
          {problem.difficulty}
        </span>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-indigo-500 transition-all"
          style={{ width: `${(index / queue.length) * 100}%` }}
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <MarkdownMath>{problem.question}</MarkdownMath>
      </div>

      <div className="space-y-2">
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
              {isCorrect ? "正解" : "不正解"}
            </p>
            <MarkdownMath>{problem.explanation}</MarkdownMath>
          </div>

          <div>
            <p className="mb-2 text-sm text-slate-500">
              記憶の定着度を選んでください(次回の出題間隔が決まります):
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(["again", "hard", "good", "easy"] as Grade4[]).map((g) => (
                <button
                  key={g}
                  onClick={() => grade(g)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50"
                >
                  {GRADE_LABELS[g]}
                </button>
              ))}
            </div>
          </div>
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
