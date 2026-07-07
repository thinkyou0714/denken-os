/**
 * bridge.ts — 収益導線の共通機構（純ロジック・DOM 非依存）。17-C1/C3/C12/C13/C18/C19。
 *
 * 3つの役割:
 *  1. ローカル計測台帳（ledger）— 導線の表示/クリックを `placement:campaign` キーで
 *     端末内に整数カウントする。個人識別子なし・外部送信なし・書き出しは手動のみ。
 *  2. 頻度制御（nudge）— 能動的な収益ナッジを「アプリ全体で1日1件＋種類別クールダウン」
 *     に制限し、オプトアウト設定で全停止できる。機能ゲート（ペイウォール自体）は対象外。
 *  3. 流入ファーストタッチ — 起動時 URL の UTM を1回だけ記録し、購入クリックと
 *     突き合わせて「どのシェアが課金につながったか」を端末内で観測する。
 *
 * 非侵襲原則の全文は docs/strategy/ideas/17-bridge-revenue-100.md 末尾を参照。
 */

import { parseUtm } from "../../lib/analytics/utm.js";
import { dayIndex, JST_OFFSET_MS } from "./dates.js";
import type { StorageLike } from "./store.js";

export const LEDGER_STORAGE_KEY = "denken:bridgeLedger";
export const NUDGE_STORAGE_KEY = "denken:bridgeNudge";
export const NUDGE_OPTOUT_KEY = "denken:bridgeOptOut";
export const ACQ_STORAGE_KEY = "denken:acq";

// ---- 1. ローカル計測台帳（C1/A21） ----

/** 台帳の形: key = `${placement}:${campaign}`、値 = 表示/クリックの整数カウント。 */
export interface LedgerEntry {
  shown: number;
  clicked: number;
}
export type Ledger = Record<string, LedgerEntry>;

/** 壊れた保存値は空台帳として扱う（throw しない）。 */
export function loadLedger(storage: StorageLike): Ledger {
  const raw = storage.getItem(LEDGER_STORAGE_KEY);
  if (!raw) return {};
  try {
    const o = JSON.parse(raw) as unknown;
    if (typeof o !== "object" || o === null || Array.isArray(o)) return {};
    const out: Ledger = {};
    for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
      const e = v as { shown?: unknown; clicked?: unknown };
      out[k] = {
        shown: typeof e.shown === "number" && e.shown >= 0 ? Math.floor(e.shown) : 0,
        clicked: typeof e.clicked === "number" && e.clicked >= 0 ? Math.floor(e.clicked) : 0,
      };
    }
    return out;
  } catch {
    console.warn(`[bridge] JSON.parse 失敗: key=${LEDGER_STORAGE_KEY}`);
    return {};
  }
}

function bumpLedger(storage: StorageLike, key: string, field: "shown" | "clicked"): void {
  const ledger = loadLedger(storage);
  const entry = ledger[key] ?? { shown: 0, clicked: 0 };
  entry[field] += 1;
  ledger[key] = entry;
  try {
    storage.setItem(LEDGER_STORAGE_KEY, JSON.stringify(ledger));
  } catch {
    // 計測はベストエフォート（学習データを優先）。
  }
}

/** 導線の表示を1回記録する。key 例: "paywall:pro" / "gear:amazon" / "dashboard:note-理論"。 */
export function recordShown(storage: StorageLike, placement: string, campaign: string): void {
  bumpLedger(storage, `${placement}:${campaign}`, "shown");
}

/** 導線のクリックを1回記録する。 */
export function recordClick(storage: StorageLike, placement: string, campaign: string): void {
  bumpLedger(storage, `${placement}:${campaign}`, "clicked");
}

/** 週次レビュー突合用の手動エクスポート（C13）。集計値と流入記録のみ・自動送信はしない。 */
export function exportLedgerJson(storage: StorageLike): string {
  return JSON.stringify({ ledger: loadLedger(storage), acquisition: loadAcquisition(storage) }, null, 2);
}

// ---- 2. 頻度制御（C3）＋オプトアウト（C18） ----

/** 収益ナッジの案内を止める設定（機能ゲート＝ペイウォール自体は対象外）。 */
export function nudgeOptedOut(storage: StorageLike): boolean {
  return storage.getItem(NUDGE_OPTOUT_KEY) === "1";
}

export function setNudgeOptOut(storage: StorageLike, off: boolean): void {
  storage.setItem(NUDGE_OPTOUT_KEY, off ? "1" : "");
}

interface NudgeState {
  /** 最後にいずれかのナッジを出した JST 日番号（グローバル1日1件の判定）。 */
  lastDay: number;
  /** 種類別に最後に出した日番号（クールダウン判定）。 */
  lastByKind: Record<string, number>;
}

function loadNudgeState(storage: StorageLike): NudgeState {
  const raw = storage.getItem(NUDGE_STORAGE_KEY);
  if (raw) {
    try {
      const o = JSON.parse(raw) as { lastDay?: unknown; lastByKind?: unknown };
      return {
        lastDay: typeof o.lastDay === "number" ? o.lastDay : -1,
        lastByKind:
          typeof o.lastByKind === "object" && o.lastByKind !== null ? (o.lastByKind as Record<string, number>) : {},
      };
    } catch {
      console.warn(`[bridge] JSON.parse 失敗: key=${NUDGE_STORAGE_KEY}`);
    }
  }
  return { lastDay: -1, lastByKind: {} };
}

/**
 * 種類 `kind` のナッジを今出してよいか。
 * 判定: オプトアウト → 学習中ガード（inFocusFlow は呼び出し側が判定） →
 * グローバル1日1件 → 種類別クールダウン（既定7日）。
 * 出す場合は必ず markNudgeShown() を呼んで予算を消費させること。
 */
export function canShowNudge(
  storage: StorageLike,
  kind: string,
  opts: { cooldownDays?: number; inFocusFlow?: boolean } = {},
  nowMs: number = Date.now(),
): boolean {
  if (nudgeOptedOut(storage)) return false;
  if (opts.inFocusFlow) return false; // 学習中（出題〜採点完了）は出さない（C19）
  const today = dayIndex(nowMs, JST_OFFSET_MS);
  const st = loadNudgeState(storage);
  if (st.lastDay === today) return false; // アプリ全体で1日1件
  const last = st.lastByKind[kind];
  const cooldown = Math.max(1, Math.floor(opts.cooldownDays ?? 7));
  if (typeof last === "number" && today - last < cooldown) return false;
  return true;
}

/** ナッジを表示した事実を記録して予算を消費する。 */
export function markNudgeShown(storage: StorageLike, kind: string, nowMs: number = Date.now()): void {
  const today = dayIndex(nowMs, JST_OFFSET_MS);
  const st = loadNudgeState(storage);
  st.lastDay = today;
  st.lastByKind[kind] = today;
  try {
    storage.setItem(NUDGE_STORAGE_KEY, JSON.stringify(st));
  } catch {
    // 保存失敗時は次回また出る可能性があるだけ（安全側）。
  }
}

// ---- 3. 流入ファーストタッチ（C12） ----

export interface Acquisition {
  source: string;
  medium: string;
  campaign: string;
  content: string;
  /** 記録した JST 日番号。 */
  day: number;
}

/**
 * 起動時 URL から UTM を1回だけ記録する（既に記録済みなら上書きしない＝ファーストタッチ）。
 * @returns UTM を見つけて新規記録したら true（呼び出し側で URL から UTM を除去する契機に使う）
 */
export function captureFirstTouch(storage: StorageLike, href: string, nowMs: number = Date.now()): boolean {
  if (storage.getItem(ACQ_STORAGE_KEY)) return false;
  let utm: ReturnType<typeof parseUtm>;
  try {
    utm = parseUtm(href);
  } catch {
    return false; // 不正な URL は無視
  }
  if (!utm.source && !utm.campaign) return false;
  const acq: Acquisition = {
    source: utm.source ?? "",
    medium: utm.medium ?? "",
    campaign: utm.campaign ?? "",
    content: utm.content ?? "",
    day: dayIndex(nowMs, JST_OFFSET_MS),
  };
  try {
    storage.setItem(ACQ_STORAGE_KEY, JSON.stringify(acq));
  } catch {
    return false;
  }
  return true;
}

/** 記録済みのファーストタッチ（なければ null）。 */
export function loadAcquisition(storage: StorageLike): Acquisition | null {
  const raw = storage.getItem(ACQ_STORAGE_KEY);
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as Partial<Acquisition>;
    if (typeof o.source !== "string") return null;
    return {
      source: o.source,
      medium: typeof o.medium === "string" ? o.medium : "",
      campaign: typeof o.campaign === "string" ? o.campaign : "",
      content: typeof o.content === "string" ? o.content : "",
      day: typeof o.day === "number" ? o.day : -1,
    };
  } catch {
    return null;
  }
}
