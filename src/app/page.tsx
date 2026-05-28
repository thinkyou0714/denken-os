"use client";

import { useRef } from "react";
import Link from "next/link";
import { useProgress } from "@/lib/useProgress";
import { useSettings } from "@/lib/useSettings";
import { problems } from "@/data/problems";
import { diagnose } from "@/domain/srs/diagnosis";
import { SUBJECT_LABELS } from "@/domain/content/schema";
import { computeStreak, weeklyActiveDays } from "@/domain/gamification/streak";
import {
  xpSummary,
  xpToNextLevel,
  levelFromSubjectXP,
} from "@/domain/gamification/xp";
import {
  computeAchievements,
  todayReviewCount,
} from "@/domain/gamification/achievements";
import { daysUntilExam } from "@/domain/settings/store";

const TODAY_MISSION_SIZE = 3;

function masteryColor(mastery: number): string {
  if (mastery >= 70) return "bg-emerald-500";
  if (mastery >= 40) return "bg-amber-500";
  return "bg-rose-500";
}

export default function DashboardPage() {
  const { store, reset, importJson, mounted } = useProgress();
  const {
    store: settings,
    mounted: settingsMounted,
  } = useSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!mounted || !settingsMounted) {
    return <DashboardSkeleton />;
  }

  const now = new Date();
  const diagnosis = diagnose(problems, store, now);
  const totalReviews = diagnosis.subjects.reduce((s, x) => s + x.reviews, 0);
  const streak = computeStreak(store.logs(), now, settings.freezes);
  const xp = xpSummary(problems, store.logs());
  const xpProgress = xpToNextLevel(xp.total);
  const achievements = computeAchievements(problems, store);
  const todayDone = todayReviewCount(store, now);
  const week = weeklyActiveDays(store.logs(), now);
  const examDays = daysUntilExam(settings.examDate, now);
  const showGame = !settings.minimalUI;

  function handleExport() {
    const blob = new Blob([store.snapshot()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `denken-os-progress-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleImportFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      if (importJson(text)) {
        alert("進捗を取り込みました。");
      } else {
        alert("ファイル形式が想定外です。読み込めませんでした。");
      }
    };
    reader.readAsText(file);
  }

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

      {showGame && (
        <section className="grid gap-3 sm:grid-cols-2">
          <StreakPanel streak={streak} settings={settings} />
          <ExamPanel days={examDays} examDate={settings.examDate} xp={xp} />
        </section>
      )}

      {showGame && (
        <TodayMissionCard
          done={todayDone}
          target={TODAY_MISSION_SIZE}
          dueCount={diagnosis.totalDue}
        />
      )}

      {showGame && totalReviews > 0 && (
        <XPCard xp={xp} progress={xpProgress} />
      )}

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
                  {showGame && (
                    <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-xs font-medium text-indigo-700">
                      Lv {levelFromSubjectXP(xp.perSubject[s.subject])}
                    </span>
                  )}
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
              <div className="mt-3 flex justify-end">
                <Link
                  href={`/study?subject=${s.subject}`}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                    s.subject === diagnosis.weakest
                      ? "bg-rose-600 text-white hover:bg-rose-700"
                      : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  この科目を重点学習
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {showGame && totalReviews > 0 && (
        <AchievementsCard achievements={achievements} />
      )}

      {showGame && totalReviews > 0 && (
        <WeeklyReportCard
          thisWeek={week.thisWeek}
          lastWeek={week.lastWeek}
          totalReviews={totalReviews}
        />
      )}

      <section className="flex flex-wrap items-center gap-4 border-t border-slate-200 pt-4 text-sm">
        {totalReviews > 0 && (
          <button
            onClick={handleExport}
            className="text-slate-600 underline-offset-2 hover:text-indigo-600 hover:underline"
          >
            進捗を書き出す
          </button>
        )}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="text-slate-600 underline-offset-2 hover:text-indigo-600 hover:underline"
        >
          進捗を読み込む
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImportFile(file);
            e.target.value = "";
          }}
        />
        {totalReviews > 0 && (
          <button
            onClick={() => {
              if (confirm("学習進捗をすべて消去します。よろしいですか？")) {
                reset();
              }
            }}
            className="ml-auto text-slate-400 underline-offset-2 hover:text-rose-600 hover:underline"
          >
            学習進捗をリセット
          </button>
        )}
      </section>
    </div>
  );
}

function StreakPanel({
  streak,
  settings,
}: {
  streak: ReturnType<typeof computeStreak>;
  settings: { freezes: number; maxFreezes: number };
}) {
  return (
    <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
      <div className="text-xs font-medium text-orange-700">連続学習</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-3xl font-bold text-orange-900">
          🔥 {streak.current}
        </span>
        <span className="text-sm text-orange-700">日</span>
      </div>
      <div className="mt-2 text-xs text-orange-800/80">
        過去最高 {streak.longest} 日 ・ フリーズ{" "}
        {settings.freezes - streak.freezesUsed}/{settings.maxFreezes}
        {streak.daysSinceLast > 1 && ` ・ 最終学習 ${streak.daysSinceLast} 日前`}
      </div>
    </div>
  );
}

function ExamPanel({
  days,
  examDate,
  xp,
}: {
  days: number | null;
  examDate: string | null;
  xp: { passZonePercent: number; rank: string };
}) {
  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
      <div className="text-xs font-medium text-indigo-700">
        受験予定 / 合格圏進捗
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        {days != null ? (
          <>
            <span className="text-3xl font-bold text-indigo-900">
              あと {days}
            </span>
            <span className="text-sm text-indigo-700">日</span>
          </>
        ) : (
          <Link
            href="/settings"
            className="text-sm font-semibold text-indigo-700 underline-offset-2 hover:underline"
          >
            設定で受験日を登録
          </Link>
        )}
      </div>
      <div className="mt-2 text-xs text-indigo-800/80">
        {examDate ? `試験日: ${examDate} ・ ` : ""}
        現在 {xp.rank} ・ 合格圏到達 {xp.passZonePercent}%
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-indigo-100">
        <div
          className="h-full rounded-full bg-indigo-500"
          style={{ width: `${xp.passZonePercent}%` }}
        />
      </div>
    </div>
  );
}

function TodayMissionCard({
  done,
  target,
  dueCount,
}: {
  done: number;
  target: number;
  dueCount: number;
}) {
  const complete = done >= target;
  const ratio = Math.min(100, Math.round((done / target) * 100));
  return (
    <div
      className={`rounded-xl border p-4 ${
        complete
          ? "border-emerald-300 bg-emerald-50"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <div className="text-sm font-semibold">今日のミッション</div>
          <div className="mt-0.5 text-xs text-slate-500">
            {complete
              ? "本日分は完了。連続記録の維持に成功 🎉"
              : `今日のうちに ${target} 問を解きましょう (残り ${target - done} 問)`}
          </div>
        </div>
        <div className="text-sm tabular-nums text-slate-700">
          {done} / {target}
        </div>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${
            complete ? "bg-emerald-500" : "bg-indigo-500"
          }`}
          style={{ width: `${ratio}%` }}
        />
      </div>
      {!complete && dueCount > 0 && (
        <Link
          href="/study"
          className="mt-3 inline-block text-xs font-semibold text-indigo-700 underline-offset-2 hover:underline"
        >
          ミッションを始める →
        </Link>
      )}
    </div>
  );
}

function XPCard({
  xp,
  progress,
}: {
  xp: ReturnType<typeof xpSummary>;
  progress: { xpInLevel: number; xpForLevel: number };
}) {
  const pct = Math.round((progress.xpInLevel / progress.xpForLevel) * 100);
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <div className="text-xs font-medium text-slate-500">総合 XP</div>
          <div className="mt-0.5 text-2xl font-bold tabular-nums">
            {xp.total}
            <span className="ml-2 text-sm font-normal text-slate-500">
              Lv {xp.level} ・ {xp.rank}
            </span>
          </div>
        </div>
        <div className="text-xs tabular-nums text-slate-500">
          次のレベルまで {progress.xpForLevel - progress.xpInLevel} XP
        </div>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-indigo-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </section>
  );
}

function AchievementsCard({
  achievements,
}: {
  achievements: ReturnType<typeof computeAchievements>;
}) {
  const items: { label: string; value: number; hint: string }[] = [
    {
      label: "Memory Locked",
      value: achievements.memoryLocked,
      hint: "7日以上の間隔で復習に成功した問題",
    },
    {
      label: "Mastered",
      value: achievements.mastered,
      hint: "30日以上の間隔で復習に成功した問題",
    },
    {
      label: "Interleaver",
      value: achievements.interleaverDays,
      hint: "1日に4科目すべて触れた日(長期定着に有効)",
    },
  ];
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">獲得バッジ</h2>
      <div className="grid grid-cols-3 gap-3">
        {items.map((it) => (
          <div
            key={it.label}
            title={it.hint}
            className="rounded-xl border border-slate-200 bg-white p-3"
          >
            <div className="text-xs text-slate-500">{it.label}</div>
            <div className="mt-1 text-2xl font-bold tabular-nums">
              {it.value}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function WeeklyReportCard({
  thisWeek,
  lastWeek,
  totalReviews,
}: {
  thisWeek: number;
  lastWeek: number;
  totalReviews: number;
}) {
  const delta = thisWeek - lastWeek;
  const trend =
    delta > 0
      ? { text: `+${delta}日`, color: "text-emerald-700" }
      : delta < 0
        ? { text: `${delta}日`, color: "text-rose-700" }
        : { text: "横ばい", color: "text-slate-500" };
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <div className="text-sm font-semibold">週次レポート</div>
          <div className="mt-0.5 text-xs text-slate-500">
            今週の活動日数(月曜起算)
          </div>
        </div>
        <div className={`text-xs font-semibold ${trend.color}`}>
          先週比 {trend.text}
        </div>
      </div>
      <div className="mt-2 flex items-baseline gap-4 text-sm">
        <span>
          今週 <strong className="text-lg tabular-nums">{thisWeek}</strong>/7 日
        </span>
        <span className="text-slate-500">
          先週 <span className="tabular-nums">{lastWeek}</span>/7 日
        </span>
        <span className="ml-auto text-slate-500">
          累計解答 <span className="tabular-nums">{totalReviews}</span>
        </span>
      </div>
    </section>
  );
}

function DashboardSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="ダッシュボードを読み込み中"
      className="space-y-8 animate-pulse"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-48 rounded bg-slate-200" />
          <div className="h-4 w-72 rounded bg-slate-200" />
        </div>
        <div className="h-10 w-44 rounded-lg bg-slate-200" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="h-24 rounded-xl bg-slate-100" />
        <div className="h-24 rounded-xl bg-slate-100" />
      </div>
      <div className="h-20 rounded-xl bg-slate-100" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-slate-100" />
        ))}
      </div>
      <div className="space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-xl bg-slate-100" />
        ))}
      </div>
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
