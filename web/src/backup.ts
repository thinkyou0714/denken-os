/**
 * backup.ts — 学習データのエクスポート/インポート（純ロジック）。
 *
 * 根本対策: 進捗が localStorage の単一保存で、ブラウザのデータ削除・機種変更・
 * 別ブラウザ移行で全消失する（学習アプリとして致命的な単一障害点）。
 * 端末間同期（Supabase）は M2 のため、まず「自分のデータを自分で持ち出せる」
 * エクスポート/インポートを提供する。秘匿情報（APIキー）は書き出さない。
 */
import { clearBadgeCache } from "./achievements.js";
import { clearByTopicCache } from "./dashboard.js";
import { clearTipIndexCache } from "./mascot.js";
import type { StorageLike } from "./store.js";
import { clearXpByDayCache } from "./xp.js";

/**
 * 集計メモ化キャッシュ（byTopic/xpByDay/badge/tip）をすべて破棄する。
 * バックアップ復元は logs/cards 配列をまるごと差し替えるため、件数や末尾時刻が
 * 偶然一致すると各キャッシュが古い結果を返しうる（キャッシュキーは内容ハッシュではない）。
 * 復元直後に全キャッシュを無効化して次回描画で必ず再計算させる。
 */
function clearDerivedCaches(): void {
  clearByTopicCache();
  clearXpByDayCache();
  clearBadgeCache();
  clearTipIndexCache();
}

/** バックアップ対象のキー。APIキー（denken:apiKey）は秘匿のため意図的に除外する。 */
export const BACKUP_KEYS: readonly string[] = [
  "denken:cards",
  "denken:logs",
  "denken:retention",
  "denken:examDate",
  "denken:dailyGoal",
  "denken:theme",
  "denken:chat",
  "denken:chatModel",
  "denken:onboarded",
  "denken:reviewCap",
  "denken:freeze",
  "denken:badges",
  "denken:sound",
  "denken:mascot",
];

export const BACKUP_VERSION = 1;
/** バックアップのメジャーバージョン（互換性の境界判定に使う）。 */
export const BACKUP_MAJOR_VERSION = 1;

export interface BackupFile {
  app: "denken-os";
  version: number;
  exportedAt: string; // ISO 8601
  data: Record<string, string>;
}

/** 現在の学習データをバックアップ JSON 文字列にする。 */
export function exportBackup(storage: StorageLike, nowMs: number = Date.now()): string {
  const data: Record<string, string> = {};
  for (const key of BACKUP_KEYS) {
    const v = storage.getItem(key);
    if (v !== null) data[key] = v;
  }
  const file: BackupFile = {
    app: "denken-os",
    version: BACKUP_VERSION,
    exportedAt: new Date(nowMs).toISOString(),
    data,
  };
  return JSON.stringify(file, null, 2);
}

export type ImportResult = { ok: true; restoredKeys: string[] } | { ok: false; reason: string };

/**
 * 復元前に各値が期待する形をしているか検証する（壊れた値で進捗を破壊しないため）。
 * - denken:logs → {atMs:number, topic:string} の配列（他フィールドは許容）
 * - denken:cards → オブジェクト（topic→Card のマップ）
 * その他のキーは従来どおり「文字列であること」のみで通す（緩い検証）。
 * @returns 妥当なら null、問題があればユーザー向けの理由文字列
 */
function validateBackupValue(key: string, raw: string): string | null {
  if (key === "denken:logs") {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return "学習ログ（denken:logs）が壊れています。";
    }
    if (!Array.isArray(parsed)) return "学習ログ（denken:logs）が配列ではありません。";
    const ok = parsed.every(
      (l) =>
        typeof l === "object" &&
        l !== null &&
        typeof (l as { atMs?: unknown }).atMs === "number" &&
        typeof (l as { topic?: unknown }).topic === "string",
    );
    if (!ok) return "学習ログ（denken:logs）の形式が不正です。";
    return null;
  }
  if (key === "denken:cards") {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return "記憶状態（denken:cards）が壊れています。";
    }
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return "記憶状態（denken:cards）の形式が不正です。";
    }
    return null;
  }
  return null;
}

/**
 * バックアップ JSON を検証して取り込む。
 * 許可リスト（BACKUP_KEYS）外のキーは黙って無視する＝悪意ある JSON で
 * 任意キーを書き込まれない（インポートは信頼できない入力として扱う）。
 */
export function importBackup(storage: StorageLike, json: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, reason: "JSON として読み取れませんでした。" };
  }
  if (typeof parsed !== "object" || parsed === null) return { ok: false, reason: "形式が不正です。" };
  const file = parsed as Partial<BackupFile>;
  if (file.app !== "denken-os") return { ok: false, reason: "DENKEN-OS のバックアップではありません。" };
  // II-152: マイナーバージョン互換を許容し、メジャーバージョン超過のみ拒否する。
  // 同一メジャー内であれば旧→新バックアップを既存キーの範囲でインポート可能。
  if (typeof file.version !== "number") {
    return { ok: false, reason: "バージョン情報が不正です。" };
  }
  const fileMajor = Math.floor(file.version);
  if (fileMajor > BACKUP_MAJOR_VERSION) {
    return { ok: false, reason: "このアプリより新しいバックアップです。アプリを更新してください。" };
  }
  if (typeof file.data !== "object" || file.data === null) return { ok: false, reason: "データ部がありません。" };

  // II-9: 書き込み前に、形が分かるキー（logs/cards）の構造を検証する。
  // 壊れた値で進捗を上書きしないよう、不正があればファイル全体を拒否する（明確な理由付き）。
  for (const key of BACKUP_KEYS) {
    const v = (file.data as Record<string, unknown>)[key];
    if (typeof v !== "string") continue;
    const problem = validateBackupValue(key, v);
    if (problem) return { ok: false, reason: problem };
  }

  const restoredKeys: string[] = [];
  for (const key of BACKUP_KEYS) {
    const v = (file.data as Record<string, unknown>)[key];
    if (typeof v !== "string") continue;
    storage.setItem(key, v);
    restoredKeys.push(key);
  }
  if (restoredKeys.length === 0) return { ok: false, reason: "復元できるデータが見つかりませんでした。" };
  // 復元でストア内容が差し替わったので、集計メモ化キャッシュを破棄して整合を保つ（T-B1）。
  clearDerivedCaches();
  return { ok: true, restoredKeys };
}
