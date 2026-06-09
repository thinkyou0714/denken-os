/**
 * settings.ts — ユーザー設定（試験日・1日の目標問題数）の永続化（純ロジック）。
 * FSRS の目標保持率は store.ts 側で管理する。
 */
import type { StorageLike } from "./store.js";

const EXAM_DATE_KEY = "denken:examDate";
const DAILY_GOAL_KEY = "denken:dailyGoal";
const THEME_KEY = "denken:theme";

/** 既定の試験日（2026年度 電験二種 一次試験の目安）。設定で上書き可。 */
export const DEFAULT_EXAM_DATE = "2026-08-30";
export const DEFAULT_DAILY_GOAL = 10;

/** テーマ設定。system=OS追従。 */
export type ThemePref = "system" | "light" | "dark";

export function getTheme(storage: StorageLike): ThemePref {
  const raw = storage.getItem(THEME_KEY);
  return raw === "light" || raw === "dark" ? raw : "system";
}

export function setTheme(storage: StorageLike, t: ThemePref): void {
  storage.setItem(THEME_KEY, t);
}

export function getExamDate(storage: StorageLike): string {
  const raw = storage.getItem(EXAM_DATE_KEY);
  return raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : DEFAULT_EXAM_DATE;
}

export function setExamDate(storage: StorageLike, iso: string): void {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) storage.setItem(EXAM_DATE_KEY, iso);
}

export function getDailyGoal(storage: StorageLike): number {
  const n = Number(storage.getItem(DAILY_GOAL_KEY));
  return Number.isFinite(n) && n >= 1 && n <= 200 ? n : DEFAULT_DAILY_GOAL;
}

export function setDailyGoal(storage: StorageLike, n: number): void {
  const clamped = Math.min(200, Math.max(1, Math.round(n)));
  storage.setItem(DAILY_GOAL_KEY, String(clamped));
}
