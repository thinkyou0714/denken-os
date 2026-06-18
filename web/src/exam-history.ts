/**
 * exam-history.ts — 模試結果の履歴（localStorage・純ロジック）（#13）。
 *
 * 模試を「その場のスコア」で終わらせず、得点の推移を残してモチベーションと
 * 弱点の傾向把握につなげる。保存は localStorage、件数は上限つき（古い順に間引く）。
 * DOM 非依存でテスト可能（StorageLike を注入）。
 */
import type { Subject } from "../../lib/engine/schema.js";
import type { StorageLike } from "./store.js";

const HISTORY_KEY = "denken:examHistory";
/** 履歴の保持上限（localStorage を圧迫しない範囲で十分な推移を残す）。 */
export const EXAM_HISTORY_CAP = 50;

export type ExamHistoryPreset = "all" | "primary" | "secondary";

export interface ExamHistoryEntry {
  /** 実施時刻（epoch ms）。 */
  atMs: number;
  /** 範囲プリセット。 */
  preset: ExamHistoryPreset;
  /** 出題された科目（重複なし）。 */
  subjects: Subject[];
  /** 総合得点率（0..100, 整数）。二次は合算得点率。 */
  scorePct: number;
  /** 出題数。 */
  total: number;
  /** 合否（一次は4科目60%・二次は合算60%・部分模試はスコアの60%判定）。 */
  passed: boolean;
}

/** 模試履歴を読み出す（壊れていれば空配列）。古い順。 */
export function loadExamHistory(storage: StorageLike): ExamHistoryEntry[] {
  const raw = storage.getItem(HISTORY_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    // 最低限のスキーマガード（古い/壊れたエントリを落とす）。
    return parsed.filter(
      (e): e is ExamHistoryEntry =>
        typeof e === "object" &&
        e !== null &&
        typeof (e as ExamHistoryEntry).atMs === "number" &&
        typeof (e as ExamHistoryEntry).scorePct === "number",
    );
  } catch {
    return [];
  }
}

/**
 * 模試結果を1件追記して保存する（上限超過は古い順に間引く）。
 * 保存に失敗しても throw しない（学習継続を永続化より優先）。返り値は保存後の履歴。
 */
export function appendExamHistory(storage: StorageLike, entry: ExamHistoryEntry): ExamHistoryEntry[] {
  const history = loadExamHistory(storage);
  history.push(entry);
  if (history.length > EXAM_HISTORY_CAP) history.splice(0, history.length - EXAM_HISTORY_CAP);
  try {
    storage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {
    // quota/プライベートモードでも落とさない。
  }
  return history;
}

/** 直近 n 件のスコア推移（古い順）。スパークライン/リスト表示用。 */
export function recentScores(history: ExamHistoryEntry[], n = 10): number[] {
  return history.slice(-n).map((e) => e.scorePct);
}
