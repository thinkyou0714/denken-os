"use client";

import { useProgress } from "@/lib/useProgress";
import { useSettings } from "@/lib/useSettings";
import { computeStreak } from "@/domain/gamification/streak";

/**
 * ヘッダ右上に常設するストリーク表示。
 * 最小 UI モード ON / 連続 0 日 / 未マウント時は描画しない。
 */
export function StreakChip() {
  const { store, mounted } = useProgress();
  const { store: settings, mounted: settingsMounted } = useSettings();
  if (!mounted || !settingsMounted) return null;
  if (settings.minimalUI) return null;

  const r = computeStreak(store.logs(), new Date(), settings.freezes);
  if (r.current === 0) return null;

  const remainingFreezes = settings.freezes - r.freezesUsed;
  const label = `連続学習 ${r.current} 日。過去最高 ${r.longest} 日。フリーズ残 ${remainingFreezes} / ${settings.maxFreezes}。`;
  return (
    <span
      role="status"
      aria-label={label}
      title={label}
      className="ml-2 inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700"
    >
      <span aria-hidden>🔥</span>
      <span>{r.current}日</span>
    </span>
  );
}
