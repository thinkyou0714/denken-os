/**
 * xp.ts — XP（経験値）とレベル（純ロジック）。
 *
 * Duolingo 型コアループの土台: 解答 → XP 獲得 → レベルアップ → 称号。
 * 設計の要点:
 *  - XP は「解答ログから完全に導出」する（専用の保存キーを持たない）。
 *    これにより既存ユーザーにも遡って付与され、バックアップ/復元/リセットも
 *    ログと常に整合する（二重管理のズレという将来バグを根本から断つ）。
 *  - 報酬設計の是正（#51）: 正解の自己評価（hard/good/easy）は **ほぼ同額** にし、
 *    むしろ努力して想起できた hard をわずかに高くする（again=4 / easy=10 / good=11 / hard=12）。
 *    旧設計は easy が最大（12）で「余裕」を選ぶほど得をするため、自己評価インフレを
 *    誘発していた。正解はどの評価でも報われるべきで、楽勝申告を最も得にしない。
 *    不正解でも 4XP（挑戦自体に報酬を与え、間違いを罰しない）。
 *  - 同日内の連続正解にはコンボボーナス（+1〜+5）。クエスト全達成は +20。
 * DOM 非依存でテスト可能。日境界は store.ts と同じ JST(UTC+9)。
 */
import type { Rating } from "../../lib/scheduler/types.js";
import {
  allQuestsClear,
  allWeeklyQuestsClear,
  dailyQuests,
  dayIndexOf,
  JST_OFFSET_MS,
  QUEST_CLEAR_BONUS_XP,
  WEEKLY_CLEAR_BONUS_XP,
  weekIndexOf,
} from "./quests.js";
import type { WebAnswerLog } from "./store.js";

/**
 * 評価別の基礎XP（#51）。正解はどの評価でもほぼ同額にし、努力して想起できた hard を
 * わずかに高くする（easy を最大にしない＝自己評価インフレを誘発しない）。
 * 不正解(again)にも参加報酬を与える（挑戦を罰しない）。
 */
export const XP_BY_RATING: Record<Rating, number> = { again: 4, hard: 12, good: 11, easy: 10 };

/** ログ1件の基礎XP。旧ログ（rating なし）は correct から good/again に写像する。 */
export function xpForLog(log: WebAnswerLog): number {
  const rating: Rating = log.rating ?? (log.correct ? "good" : "again");
  return XP_BY_RATING[rating];
}

/** 連続正解ボーナス: 2連続目から +1、上限 +5（run は連続正解の通し番号、1始まり）。 */
export function comboBonus(runLength: number): number {
  return runLength >= 2 ? Math.min(5, runLength - 1) : 0;
}

/** クエスト全達成後、その日の残りの正解XPに掛かる倍率（時間限定ブーストの決定論版）。 */
export const QUEST_BOOST_MULT = 1.5;

/** 1日分のXP（基礎＋コンボ＋クエスト全達成後の×1.5ブースト）。dayLogs は時系列順。 */
function xpOfDay(dayLogs: readonly WebAnswerLog[], dayIndex: number): number {
  const quests = dailyQuests(dayIndex);
  let total = 0;
  let run = 0;
  let cleared = false;
  // クエスト進捗を増分更新する（全種とも単調増加なので一度クリアしたら戻らない）。
  let count = 0;
  let correct = 0;
  let maxRun = 0;
  const topics = new Set<string>();
  const correctTopics = new Set<string>(); // 正解した論点の種類（mastery クエスト用 #51）。
  for (const l of dayLogs) {
    run = l.correct ? run + 1 : 0;
    const base = xpForLog(l) + (l.correct ? comboBonus(run) : 0);
    // ブーストは「クリアを確定させた解答の次」から。挑戦(不正解)の参加報酬には掛けない。
    total += cleared && l.correct ? Math.round(base * QUEST_BOOST_MULT) : base;
    count += 1;
    if (l.correct) correct += 1;
    if (run > maxRun) maxRun = run;
    topics.add(l.topic);
    if (l.correct) correctTopics.add(l.topic);
    if (!cleared) {
      cleared = quests.every((q) => {
        switch (q.kind) {
          case "solve":
            return count >= q.target;
          case "correct":
            return correct >= q.target;
          case "combo":
            return maxRun >= q.target;
          case "topics":
            return topics.size >= q.target;
          case "mastery":
            return correctTopics.size >= q.target;
          default:
            return false;
        }
      });
    }
  }
  return total;
}

/** 基礎XP＋コンボ＋ブーストの合計（クエスト達成ボーナス自体は含まない）。 */
export function xpFromLogs(logs: readonly WebAnswerLog[], dayOffsetMs: number = JST_OFFSET_MS): number {
  const sorted = [...logs].sort((a, b) => a.atMs - b.atMs);
  let total = 0;
  let i = 0;
  while (i < sorted.length) {
    // while 条件で i < sorted.length を確認済みのため sorted[i] は存在する。
    const day = dayIndexOf((sorted[i] as WebAnswerLog).atMs, dayOffsetMs);
    const dayLogs: WebAnswerLog[] = [];
    while (i < sorted.length && dayIndexOf((sorted[i] as WebAnswerLog).atMs, dayOffsetMs) === day) {
      dayLogs.push(sorted[i] as WebAnswerLog);
      i += 1;
    }
    total += xpOfDay(dayLogs, day);
  }
  return total;
}

/** デイリークエスト全達成ボーナスの合計（達成した日ごとに +20）。 */
export function questBonusXp(logs: readonly WebAnswerLog[], dayOffsetMs: number = JST_OFFSET_MS): number {
  const byDay = new Map<number, WebAnswerLog[]>();
  for (const l of logs) {
    const d = dayIndexOf(l.atMs, dayOffsetMs);
    const arr = byDay.get(d) ?? [];
    arr.push(l);
    byDay.set(d, arr);
  }
  let total = 0;
  for (const [dayIndex, dayLogs] of byDay) {
    dayLogs.sort((a, b) => a.atMs - b.atMs);
    if (allQuestsClear(dayLogs, dayIndex)) total += QUEST_CLEAR_BONUS_XP;
  }
  return total;
}

/** ウィークリークエスト全達成ボーナスの合計（達成した週ごとに +50）。 */
export function weeklyBonusXp(logs: readonly WebAnswerLog[], dayOffsetMs: number = JST_OFFSET_MS): number {
  const byWeek = new Map<number, WebAnswerLog[]>();
  for (const l of logs) {
    const w = weekIndexOf(l.atMs, dayOffsetMs);
    const arr = byWeek.get(w) ?? [];
    arr.push(l);
    byWeek.set(w, arr);
  }
  let total = 0;
  for (const [weekIndex, weekLogs] of byWeek) {
    weekLogs.sort((a, b) => a.atMs - b.atMs);
    if (allWeeklyQuestsClear(weekLogs, weekIndex, dayOffsetMs)) total += WEEKLY_CLEAR_BONUS_XP;
  }
  return total;
}

/** 累計XP（基礎＋コンボ＋日次クエスト＋週次クエストボーナス）。 */
export function totalXp(logs: readonly WebAnswerLog[], dayOffsetMs: number = JST_OFFSET_MS): number {
  return xpFromLogs(logs, dayOffsetMs) + questBonusXp(logs, dayOffsetMs) + weeklyBonusXp(logs, dayOffsetMs);
}

/** 科目別の累計XP（基礎XPのみ。topic→科目の対応が無いログは「その他」に集計しない＝除外）。 */
export function xpBySubject(
  logs: readonly WebAnswerLog[],
  subjectOf: ReadonlyMap<string, string>,
): Map<string, number> {
  const out = new Map<string, number>();
  for (const l of logs) {
    const s = subjectOf.get(l.topic);
    if (!s) continue;
    out.set(s, (out.get(s) ?? 0) + xpForLog(l));
  }
  return out;
}

/** レベル n → n+1 に必要なXP。序盤は速く上がり（即時の達成感）、後半は緩やかに。 */
export function xpNeededFor(level: number): number {
  return 40 + 25 * (Math.max(1, level) - 1);
}

/** レベルの上限（無限インフレ防止。試験合格までの期間で到達しうる範囲に収める）。 */
export const LEVEL_CAP = 99;

/** レベルごとの称号（電験の学習段階になぞらえる）。しきい値以上で最後の称号を維持。 */
const TITLES: ReadonlyArray<readonly [number, string]> = [
  [1, "見習い電気係"],
  [2, "配線ルーキー"],
  [3, "テスター使い"],
  [5, "回路の旅人"],
  [7, "オームの探求者"],
  [10, "キルヒホッフの徒"],
  [13, "フェーザ術師"],
  [16, "変圧マイスター"],
  [20, "系統の守り手"],
  [25, "同期の達人"],
  [30, "電験チャレンジャー"],
  [35, "主任技術者の卵"],
  [40, "電験マイスター"],
  [50, "レジェンド主任技術者"],
];

export function titleForLevel(level: number): string {
  // TITLES はリテラル配列で要素が存在することが保証される。
  let title = (TITLES[0] as (typeof TITLES)[number])[1];
  for (const [lv, t] of TITLES) {
    if (level >= lv) title = t;
  }
  return title;
}

export interface LevelInfo {
  level: number;
  title: string;
  /** 現レベル内で獲得済みのXP。 */
  xpInto: number;
  /** 次のレベルまでに必要なXP（現レベルの総量）。 */
  xpNeed: number;
  /** 0..1 の進捗（レベル上限では 1）。 */
  progress: number;
  totalXp: number;
  /** 次に解放される称号（目標勾配のティーザー。最上位到達後は null）。 */
  nextTitle: { level: number; title: string } | null;
}

/** 現在レベルの次に控える称号（しきい値表の次エントリ）。 */
export function nextTitleFor(level: number): { level: number; title: string } | null {
  for (const [lv, title] of TITLES) {
    if (lv > level) return { level: lv, title };
  }
  return null;
}

/** 累計XPからレベル・称号・次レベルへの進捗を求める。 */
export function levelInfo(xp: number): LevelInfo {
  const total = Math.max(0, Math.floor(xp));
  let level = 1;
  let rest = total;
  while (level < LEVEL_CAP && rest >= xpNeededFor(level)) {
    rest -= xpNeededFor(level);
    level += 1;
  }
  const need = xpNeededFor(level);
  const capped = level >= LEVEL_CAP;
  return {
    level,
    title: titleForLevel(level),
    xpInto: rest,
    xpNeed: need,
    progress: capped ? 1 : Math.min(1, rest / need),
    totalXp: total,
    nextTitle: nextTitleFor(level),
  };
}

/** 直近 days 日の日別獲得XP（古い順→今日）。週間XPチャートに使う。 */
export function xpByDay(
  logs: readonly WebAnswerLog[],
  days: number,
  nowMs: number,
  dayOffsetMs: number = JST_OFFSET_MS,
): number[] {
  const todayIdx = dayIndexOf(nowMs, dayOffsetMs);
  const byDay = new Map<number, WebAnswerLog[]>();
  for (const l of logs) {
    const d = dayIndexOf(l.atMs, dayOffsetMs);
    if (d > todayIdx || d <= todayIdx - days) continue;
    const arr = byDay.get(d) ?? [];
    arr.push(l);
    byDay.set(d, arr);
  }
  const out: number[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const dayLogs = (byDay.get(todayIdx - i) ?? []).sort((a, b) => a.atMs - b.atMs);
    let xp = xpFromLogs(dayLogs, dayOffsetMs);
    if (allQuestsClear(dayLogs, todayIdx - i)) xp += QUEST_CLEAR_BONUS_XP;
    out.push(xp);
  }
  return out;
}

// ---- II-143: xpByDay メモ化キャッシュ ----
// ログが追記された（長さが増えた）ときのみ再計算する差分更新キャッシュ。
// 結果は非キャッシュ時の xpByDay と完全一致することをテストで保証する。

interface XpByDayCache {
  logsLength: number;
  lastLogAtMs: number;
  days: number;
  todayIdx: number;
  dayOffsetMs: number;
  result: number[];
}

let _xpByDayCache: XpByDayCache | null = null;

/**
 * xpByDay のメモ化版。
 * ログの件数・最終ログ時刻・days・todayIdx・dayOffsetMs が変化したときのみ再計算する。
 * キャッシュヒット時は前回の結果を返す（純粋性は保証される）。
 */
export function xpByDayCached(
  logs: readonly WebAnswerLog[],
  days: number,
  nowMs: number,
  dayOffsetMs: number = JST_OFFSET_MS,
): number[] {
  const todayIdx = dayIndexOf(nowMs, dayOffsetMs);
  const logsLength = logs.length;
  const lastLogAtMs = logsLength > 0 ? (logs[logsLength - 1] as WebAnswerLog).atMs : 0;
  if (
    _xpByDayCache !== null &&
    _xpByDayCache.logsLength === logsLength &&
    _xpByDayCache.lastLogAtMs === lastLogAtMs &&
    _xpByDayCache.days === days &&
    _xpByDayCache.todayIdx === todayIdx &&
    _xpByDayCache.dayOffsetMs === dayOffsetMs
  ) {
    return _xpByDayCache.result;
  }
  const result = xpByDay(logs, days, nowMs, dayOffsetMs);
  _xpByDayCache = { logsLength, lastLogAtMs, days, todayIdx, dayOffsetMs, result };
  return result;
}

/** xpByDay キャッシュを強制クリアする（テスト・リセット用）。 */
export function clearXpByDayCache(): void {
  _xpByDayCache = null;
}
