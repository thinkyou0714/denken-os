/**
 * state/app.ts — アプリケーション全体の共有状態。
 * problems 配列・loadFailed・現在 view・progress インスタンス・テーマ。
 */
import type { Problem } from "../../../lib/engine/schema.js";
import { getTheme } from "../settings.js";
import { LocalProgress } from "../store.js";

export const storage = window.localStorage;
export const progress = new LocalProgress(storage);

/** 読み込み済みの問題リスト。 */
export let problems: Problem[] = [];
export function setProblems(p: Problem[]): void {
  problems = p;
}

/** problems.json の読込に失敗したか（オフライン初回起動など）。リトライ導線を出す。 */
export let loadFailed = false;
export function setLoadFailed(v: boolean): void {
  loadFailed = v;
}

/** 現在表示中のタブ ID。 */
export let view = "practice";
export function setView(id: string): void {
  view = id;
}

/** テーマ設定を解決して <html data-theme> に反映（system は OS 追従）。 */
export function applyTheme(): void {
  const pref = getTheme(storage);
  const dark = pref === "dark" || (pref === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}

/** A2HS（ホーム画面追加）のプロンプト。対応ブラウザが発火したときだけ保持される。 */
export interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
}
export let installPrompt: InstallPromptEvent | null = null;
export function setInstallPrompt(p: InstallPromptEvent | null): void {
  installPrompt = p;
}
