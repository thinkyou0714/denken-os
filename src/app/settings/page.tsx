"use client";

import { useSettings } from "@/lib/useSettings";

export default function SettingsPage() {
  const { store, setExamDate, setMinimalUI, mounted } = useSettings();
  if (!mounted) return <p className="text-slate-500">読み込み中…</p>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">設定</h1>
        <p className="mt-1 text-sm text-slate-500">
          学習体験のカスタマイズ。
        </p>
      </div>

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">受験予定日</h2>
        <p className="text-sm text-slate-500">
          設定するとダッシュボードに残日数が表示され、目標から逆算した学習計画が立てやすくなります。
        </p>
        <input
          type="date"
          value={store.examDate ?? ""}
          onChange={(e) => setExamDate(e.target.value || null)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        />
        {store.examDate && (
          <button
            onClick={() => setExamDate(null)}
            className="ml-3 text-sm text-slate-400 hover:text-rose-600 hover:underline"
          >
            クリア
          </button>
        )}
      </section>

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">表示モード</h2>
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={store.minimalUI}
            onChange={(e) => setMinimalUI(e.target.checked)}
            className="mt-1"
          />
          <span className="text-sm">
            <span className="font-medium">最小 UI モード</span>
            <span className="block text-slate-500">
              ストリーク・XP・バッジ等のゲーミフィケーション要素を非表示にし、純粋に学習内容のみを表示します。
              プレッシャーを感じる方や、装飾を好まない方に。
            </span>
          </span>
        </label>
      </section>

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">ストリーク・フリーズ</h2>
        <p className="text-sm text-slate-500">
          連続学習日数(ストリーク)の途中ギャップを自動で埋めるリザーブ。
          毎月初に最大 {store.maxFreezes} 枚まで補充されます。
          途切れても罪悪感を抱かないための学習科学に基づいた設計です。
        </p>
        <div className="text-sm">
          現在の保有枚数:{" "}
          <span className="font-semibold tabular-nums">
            {store.freezes} / {store.maxFreezes}
          </span>
        </div>
      </section>
    </div>
  );
}
