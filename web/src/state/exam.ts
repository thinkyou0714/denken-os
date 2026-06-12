/**
 * state/exam.ts — 模試タブの状態・タイマー・開始/終了処理。
 */
import type { Problem } from "../../../lib/engine/schema.js";

export type ExamPreset = "all" | "primary" | "secondary";

export interface ExamState {
  set: Problem[];
  idx: number;
  results: boolean[];
  startedAt: number;
  timerId: number | null;
  preset: ExamPreset;
  /** 制限時間（ms）。形式別の持ち時間合計（examTimeLimitMs）。 */
  limitMs: number;
  /** 時間切れで強制終了したか（結果画面で明示する）。 */
  timedOut: boolean;
  /** 開始時点でクエスト全達成済みだったか（結果画面での達成祝賀の判定）。 */
  questsClearAtStart: boolean;
  /** 開始時点で週次クエスト全達成済みだったか。 */
  weeklyClearAtStart: boolean;
  /** 開始時点の今日の解答数（模試中の日次目標達成を祝うため）。 */
  todayCountAtStart: number;
  /** 結果画面の祝賀（紙吹雪等）を実行済みか（タブ再描画での再発火を防ぐ）。 */
  celebrated: boolean;
}

export let exam: ExamState | null = null;

export function setExam(e: ExamState | null): void {
  exam = e;
}
