/**
 * settings.ts — ユーザー設定（試験日・1日の目標問題数・AIチャット）の永続化（純ロジック）。
 * FSRS の目標保持率は store.ts 側で管理する。
 */
import { CHAT_MODELS, DEFAULT_CHAT_MODEL } from "../../lib/chat/prompt.js";
import type { StorageLike } from "./store.js";

const EXAM_DATE_KEY = "denken:examDate";
const DAILY_GOAL_KEY = "denken:dailyGoal";
const THEME_KEY = "denken:theme";
const API_KEY_KEY = "denken:apiKey";
const CHAT_MODEL_KEY = "denken:chatModel";
const ONBOARDED_KEY = "denken:onboarded";
const REVIEW_CAP_KEY = "denken:reviewCap";

/** 既定の試験日（2026年度 電験二種 一次試験の目安）。設定で上書き可。 */
export const DEFAULT_EXAM_DATE = "2026-08-30";
export const DEFAULT_DAILY_GOAL = 10;
/** 1日に出す復習の上限（retention.ts の既定と揃える）。 */
export const DEFAULT_REVIEW_CAP = 30;

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

// ---- AIチャット（BYOK: ユーザー自身の Anthropic API キー）----
// キーはこの端末の localStorage のみに保存し、送信先は api.anthropic.com のみ。
// リポジトリ・サーバには一切送らない（.env と同じく秘匿情報の扱い）。

export function getApiKey(storage: StorageLike): string {
  return storage.getItem(API_KEY_KEY)?.trim() ?? "";
}

/** 空文字で実質削除（StorageLike に removeItem が無いため）。 */
export function setApiKey(storage: StorageLike, key: string): void {
  storage.setItem(API_KEY_KEY, key.trim());
}

export function getChatModel(storage: StorageLike): string {
  const raw = storage.getItem(CHAT_MODEL_KEY);
  return CHAT_MODELS.some((m) => m.id === raw) ? (raw as string) : DEFAULT_CHAT_MODEL;
}

export function setChatModel(storage: StorageLike, id: string): void {
  if (CHAT_MODELS.some((m) => m.id === id)) storage.setItem(CHAT_MODEL_KEY, id);
}

// ---- 復習の1日上限（リテンション: 多すぎる復習による離脱を防ぐ）----

export function getReviewCap(storage: StorageLike): number {
  const n = Number(storage.getItem(REVIEW_CAP_KEY));
  return Number.isFinite(n) && n >= 5 && n <= 200 ? n : DEFAULT_REVIEW_CAP;
}

export function setReviewCap(storage: StorageLike, n: number): void {
  const clamped = Math.min(200, Math.max(5, Math.round(n)));
  storage.setItem(REVIEW_CAP_KEY, String(clamped));
}

// ---- 効果音（正解音・ファンファーレ等。既定オン・いつでもオフにできる）----

const SOUND_KEY = "denken:sound";

export function getSound(storage: StorageLike): boolean {
  return storage.getItem(SOUND_KEY) !== "0";
}

export function setSound(storage: StorageLike, on: boolean): void {
  storage.setItem(SOUND_KEY, on ? "1" : "0");
}

// ---- マスコット表示（キャラ演出が不要な学習者向けに切れる。既定オン）----

const MASCOT_KEY = "denken:mascot";

export function getMascotEnabled(storage: StorageLike): boolean {
  return storage.getItem(MASCOT_KEY) !== "0";
}

export function setMascotEnabled(storage: StorageLike, on: boolean): void {
  storage.setItem(MASCOT_KEY, on ? "1" : "0");
}

// ---- オンボーディング（初回ガイドの既読管理）----

export function isOnboarded(storage: StorageLike): boolean {
  return storage.getItem(ONBOARDED_KEY) === "1";
}

export function setOnboarded(storage: StorageLike): void {
  storage.setItem(ONBOARDED_KEY, "1");
}
