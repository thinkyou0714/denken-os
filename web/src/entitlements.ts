/**
 * entitlements.ts — プラン（無料/Pro）の判定と無料枠カウンタ（純ロジック・DOM 非依存）。
 *
 * 線引き（docs/x-strategy/07 のフリーミアム設計に準拠）:
 *  - 無料: 学習タブ 1日 N 問（monetization-config.ts）・復習・公式集・進捗・質問タブ。
 *  - Pro : 無制限演習・模試（本番再現/年度別含む）・スキルドリル。
 *
 * 注意: クライアント側ゲートは技術的には回避可能（OSS・localStorage）。
 * これは応援課金（honor system）としての設計であり、厳密な防御は目的にしない。
 * ライセンスの真正性（偽造不可）だけは ECDSA 署名で担保する（license.ts）。
 */

import { type LicensePayload, verifyLicense } from "../../lib/license/license.js";
import { dayIndex, JST_OFFSET_MS } from "./dates.js";
import { MONETIZATION, type MonetizationConfig, monetizationConfigured } from "./monetization-config.js";
import type { StorageLike } from "./store.js";

/** 検証済みライセンスキーの保存先。バックアップにも含める（機種変更で失わない）。 */
export const LICENSE_STORAGE_KEY = "denken:license";
/** 無料枠カウンタの保存先（JST 日番号とその日の学習タブ解答数）。 */
export const DAILY_USE_STORAGE_KEY = "denken:dailyUse";

/** 検証済み Pro ライセンスの payload（未解錠なら null）。セッション内キャッシュ。 */
let _proPayload: LicensePayload | null = null;

/** Pro 解錠済みか（同期・キャッシュ参照）。initEntitlements / applyLicenseKey が更新する。 */
export function proUnlocked(): boolean {
  return _proPayload !== null;
}

/** 解錠中のライセンス情報（設定画面の表示用）。 */
export function proInfo(): LicensePayload | null {
  return _proPayload;
}

/** 機能ゲートが作動中か（収益化が設定済み かつ Pro 未解錠）。 */
export function featureLocked(cfg: MonetizationConfig = MONETIZATION): boolean {
  return monetizationConfigured(cfg) && _proPayload === null;
}

/**
 * 起動時に保存済みライセンスを再検証してキャッシュを温める。
 * 不正・期限切れなら未解錠のまま（保存値は消さない: 端末時計ずれの可能性があるため）。
 */
export async function initEntitlements(
  storage: StorageLike,
  nowMs: number = Date.now(),
  cfg: MonetizationConfig = MONETIZATION,
): Promise<boolean> {
  _proPayload = null;
  // publicKeyJwk を local に取り出して null 判定を1回にする（monetizationConfigured と
  // 独立した第2のゲート条件に見えないように。narrowing のためでもある）。
  const pub = cfg.publicKeyJwk;
  if (pub === null || !monetizationConfigured(cfg)) return false;
  const key = storage.getItem(LICENSE_STORAGE_KEY)?.trim() ?? "";
  if (key === "") return false;
  const res = await verifyLicense(key, pub, nowMs);
  if (res.ok) _proPayload = res.payload;
  return res.ok;
}

export type ApplyLicenseResult = { ok: true; payload: LicensePayload } | { ok: false; reason: string };

/** 入力されたライセンスキーを検証し、有効なら保存して Pro を解錠する。 */
export async function applyLicenseKey(
  storage: StorageLike,
  key: string,
  nowMs: number = Date.now(),
  cfg: MonetizationConfig = MONETIZATION,
): Promise<ApplyLicenseResult> {
  const pub = cfg.publicKeyJwk;
  if (pub === null) return { ok: false, reason: "現在は販売準備中のためライセンスを登録できません" };
  const trimmed = key.trim();
  if (trimmed === "") return { ok: false, reason: "ライセンスキーを入力してください" };
  const res = await verifyLicense(trimmed, pub, nowMs);
  if (!res.ok) return res;
  // 検証済みキーの保存はベストエフォート: quota 超過・プライベートモードで setItem が
  // throw しても検証は成功しているため、このセッションは解錠して ok を返す
  // （reject させると設定画面のエラー表示を素通りして汎用トーストだけが出る）。
  try {
    storage.setItem(LICENSE_STORAGE_KEY, trimmed);
  } catch {
    // 次回起動では無料プランに戻るが、キーの再入力で復帰できる。
  }
  _proPayload = res.payload;
  return res;
}

/** ライセンスを削除して無料プランに戻す（StorageLike に removeItem が無いため空文字で消す）。 */
export function clearLicense(storage: StorageLike): void {
  storage.setItem(LICENSE_STORAGE_KEY, "");
  _proPayload = null;
}

// ---- 無料枠カウンタ（学習タブの新規解答のみ。復習・模試は数えない）----

interface DailyUse {
  day: number;
  count: number;
}

/** 保存値を読む。日をまたいでいたら 0 にリセット。壊れた値も 0 扱い（throw しない）。 */
function loadDailyUse(storage: StorageLike, nowMs: number): DailyUse {
  const today = dayIndex(nowMs, JST_OFFSET_MS);
  const raw = storage.getItem(DAILY_USE_STORAGE_KEY);
  if (raw) {
    try {
      const o = JSON.parse(raw) as { day?: unknown; count?: unknown };
      if (typeof o.day === "number" && o.day === today && typeof o.count === "number" && o.count >= 0) {
        return { day: today, count: Math.floor(o.count) };
      }
    } catch {
      // 壊れた保存値は当日 0 として扱う（他の storage 読み出しと同じ診断ログ規約）。
      console.warn(`[entitlements] JSON.parse 失敗: key=${DAILY_USE_STORAGE_KEY}`);
    }
  }
  return { day: today, count: 0 };
}

/** 今日（JST）の学習タブ解答数。 */
export function usedToday(storage: StorageLike, nowMs: number = Date.now()): number {
  return loadDailyUse(storage, nowMs).count;
}

/** 無料枠の残り問題数。ゲート非作動（Pro/未設定）のときは Infinity。 */
export function remainingFreeToday(
  storage: StorageLike,
  nowMs: number = Date.now(),
  cfg: MonetizationConfig = MONETIZATION,
): number {
  if (!featureLocked(cfg)) return Number.POSITIVE_INFINITY;
  return Math.max(0, cfg.freeDailyLimit - usedToday(storage, nowMs));
}

/** 学習タブで新しい問題を出してよいか。 */
export function practiceGateAllows(
  storage: StorageLike,
  nowMs: number = Date.now(),
  cfg: MonetizationConfig = MONETIZATION,
): boolean {
  return remainingFreeToday(storage, nowMs, cfg) > 0;
}

/**
 * 学習タブの解答を1件カウントする（finalize から呼ぶ）。
 * ゲート非作動時は何も書かない（既存ユーザーの storage を汚さない）。
 * 保存失敗（quota 等）は握りつぶす: 学習の記録（progress.record）を優先し、
 * カウンタはベストエフォートでよい。
 */
export function recordPracticeAnswer(
  storage: StorageLike,
  nowMs: number = Date.now(),
  cfg: MonetizationConfig = MONETIZATION,
): void {
  if (!featureLocked(cfg)) return;
  const u = loadDailyUse(storage, nowMs);
  try {
    storage.setItem(DAILY_USE_STORAGE_KEY, JSON.stringify({ day: u.day, count: u.count + 1 }));
  } catch {
    // カウンタ保存はベストエフォート。
  }
}

/** テスト用: モジュール内キャッシュを初期化する。アプリ本体からは呼ばない。 */
export function __resetEntitlementsForTest(): void {
  _proPayload = null;
}
