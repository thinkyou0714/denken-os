/**
 * retention.ts — 学習継続（リテンション）の純ロジック。
 *
 * 根本対策:
 *  - 復習キューが無制限だと、数日空けた復帰時に大量の復習が一気に出て挫折する
 *    （間隔反復アプリ共通の離脱要因）。1日の上限でバッチ化し「今日の分」に絞る。
 *  - ストリークは崩れる予兆（昨日やったが今日まだ）を出さないと守れない。
 *    状態を active / at-risk / broken に分類し、背中を押すメッセージを返す。
 * DOM 非依存でテスト可能。日境界は store.ts / plan.ts と同じ JST(UTC+9)。
 */
import type { WebAnswerLog } from "./store.js";

const DAY_MS = 86_400_000;
/** 既定の日境界は日本標準時。国内試験の受験者は JST 生活のため。 */
export const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 1日に出す復習の既定上限。多すぎる復習による離脱を防ぐ（設定で変更可）。 */
export const DEFAULT_DAILY_REVIEW_CAP = 30;

/** epoch ms を JST 日番号へ。 */
function dayIndex(ms: number, offset: number): number {
  return Math.floor((ms + offset) / DAY_MS);
}

export interface ReviewBatch {
  /** 今日出す分（due 順を尊重して上限で切る）。 */
  batch: string[];
  /** 今日まだ出せる残り枠。 */
  remaining: number;
  /** 上限超過で明日以降に回した件数。 */
  overflow: number;
  /** 上限に達したか（UI で「残りは明日」を案内する）。 */
  capped: boolean;
}

/**
 * 復習キューを1日上限でバッチ化する。
 * @param dueTopics due の早い順に並んだ復習対象 topic
 * @param cap 1日の上限（既定30）
 * @param alreadyDoneToday 今日すでにこなした復習数（残り枠から差し引く）
 */
export function dailyReviewBatch(
  dueTopics: string[],
  cap: number = DEFAULT_DAILY_REVIEW_CAP,
  alreadyDoneToday = 0,
): ReviewBatch {
  const safeCap = Math.max(1, Math.floor(cap));
  const remaining = Math.max(0, safeCap - Math.max(0, alreadyDoneToday));
  const batch = dueTopics.slice(0, remaining);
  const overflow = dueTopics.length - batch.length;
  return { batch, remaining, overflow, capped: overflow > 0 };
}

export type StreakState = "none" | "active" | "at-risk" | "broken";

export interface StreakStatus {
  state: StreakState;
  /** 現在の連続日数（active/at-risk のとき有効）。 */
  days: number;
  /** UI に出す一言（背中を押す/祝う/再開を促す）。 */
  message: string;
}

/**
 * ストリークの状態を判定する。
 *  - active : 今日すでに学習済み
 *  - at-risk: 昨日まで継続中だが今日まだ（今日やれば継続、やらねば途切れる）
 *  - broken : 直近の学習が一昨日以前（連続が途切れている）
 *  - none   : 学習履歴なし
 */
export function streakStatus(
  logs: WebAnswerLog[],
  nowMs: number = Date.now(),
  dayOffsetMs: number = JST_OFFSET_MS,
  /** 学習日として追加で数える日（ストリークお守りで肩代わりした JST 日番号）。 */
  extraDays: ReadonlySet<number> = new Set(),
): StreakStatus {
  if (logs.length === 0 && extraDays.size === 0)
    return { state: "none", days: 0, message: "今日から始めましょう。まずは1問！" };

  const days = new Set(logs.map((l) => dayIndex(l.atMs, dayOffsetMs)));
  for (const d of extraDays) days.add(d);
  const today = dayIndex(nowMs, dayOffsetMs);

  // 連続日数を、今日 or 昨日を起点に遡って数える。
  const anchor = days.has(today) ? today : days.has(today - 1) ? today - 1 : null;
  let streak = 0;
  if (anchor !== null) {
    let cursor = anchor;
    while (days.has(cursor)) {
      streak += 1;
      cursor -= 1;
    }
  }

  if (days.has(today)) {
    return { state: "active", days: streak, message: `🔥 ${streak}日連続！今日も達成しています。` };
  }
  if (days.has(today - 1)) {
    return {
      state: "at-risk",
      days: streak,
      message: `🔥 ${streak}日連続が途切れそう。今日1問解けば継続できます。`,
    };
  }
  return { state: "broken", days: 0, message: "少し間が空きました。軽い1問から再開しましょう。" };
}

/** オフライン表示のラベル（純関数化してテスト可能に）。 */
export function offlineLabel(online: boolean): string {
  return online ? "" : "📴 オフライン";
}
