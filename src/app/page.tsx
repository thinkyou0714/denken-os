"use client";

import Link from "next/link";
import { useProgress } from "@/lib/useProgress";
import { problems } from "@/data/problems";
import { diagnose } from "@/domain/srs/diagnosis";
import { SUBJECT_LABELS } from "@/domain/content/schema";

function masteryColor(mastery: number): string {
  if (mastery >= 70) return "bg-emerald-500";
  if (mastery >= 40) return "bg-amber-500";
  return "bg-rose-500";
}

export default function DashboardPage() {
  const { store, reset, mounted } = useProgress();

  if (!mounted) {
    return <p className="text-slate-500">読み込み中…</p>;
  }

  const diagnosis = diagnose(problems, store);
  const totalReviews = diagnosis.subjects.reduce((s, x) => s + x.reviews, 0);

  return (
    <div className="space-y-8">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">学習ダッシュボード</h1>
          <p className="mt-1 text-sm text-slate-500">
            FSRS による間隔反復で、弱点科目を自動診断します。
          </p>
        </div>
        <Link
          href="/study"
          className="rounded-lg bg-indigo-600 px-5 py-2.5 font-semibold text-white shadow-sm transition hover:bg-indigo-700"
        >
          今日の学習を始める
          {diagnosis.totalDue > 0 && (
            <span className="ml-2 rounded-full bg-white/25 px-2 py-0.5 text-xs">
              {diagnosis.totalDue} 問
            </span>
          )}
        </Link>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="総問題数" value={problems.length} />
        <StatCard label="復習待ち" value={diagnosis.totalDue} />
        <StatCard label="累計解答" value={totalReviews} />
        <StatCard
          label="要注意科目"
          value={
            diagnosis.weakest ? SUBJECT_LABELS[diagnosis.weakest] : "—"
          }
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">科目別の習熟度</h2>
        <div className="space-y-3">
          {diagnosis.subjects.map((s) => (
            <div
              key={s.subject}
              className={`rounded-xl border bg-white p-4 ${
                s.subject === diagnosis.weakest
                  ? "border-rose-300 ring-1 ring-rose-200"
                  : "border-slate-200"
              }`}
            >
              <div className="flex items-baseline justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">
                    {SUBJECT_LABELS[s.subject]}
                  </span>
                  {s.subject === diagnosis.weakest && (
                    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">
                      要強化
                    </span>
                  )}
                </div>
                <span className="text-sm tabular-nums text-slate-500">
                  習熟度 {s.mastery}
                </span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${masteryColor(s.mastery)}`}
                  style={{ width: `${s.mastery}%` }}
                />
              </div>
              <dl className="mt-3 grid grid-cols-4 gap-2 text-xs text-slate-500">
                <Metric label="学習済" value={`${s.seen}/${s.total}`} />
                <Metric label="復習待ち" value={s.dueCount} />
                <Metric
                  label="正答率"
                  value={s.reviews ? `${Math.round(s.accuracy * 100)}%` : "—"}
                />
                <Metric
                  label="保持率"
                  value={s.seen ? `${Math.round(s.avgRetrievability * 100)}%` : "—"}
                />
              </dl>
            </div>
          ))}
        </div>
      </section>

      {totalReviews > 0 && (
        <section className="border-t border-slate-200 pt-4">
          <button
            onClick={() => {
              if (confirm("学習進捗をすべて消去します。よろしいですか？")) {
                reset();
              }
            }}
            className="text-sm text-slate-400 underline-offset-2 hover:text-rose-600 hover:underline"
          >
            学習進捗をリセット
          </button>
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-slate-400">{label}</dt>
      <dd className="font-medium tabular-nums text-slate-700">{value}</dd>
    </div>
  );
}
