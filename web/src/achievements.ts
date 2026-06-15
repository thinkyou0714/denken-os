/**
 * achievements.ts — 実績バッジ（純ロジック）。
 *
 * 継続設計: ストリークやXPが「毎日の小さな報酬」なら、実績は「節目の大きな報酬」。
 * 蓄積型（解答数）・継続型（ストリーク）・行動の幅（科目/論点）・復帰（不死鳥）など
 * 多様な軸を用意し、どんな学習スタイルでも何かが進むようにする（万人に達成経路を残す）。
 *  - 判定はすべて解答ログ＋導出値から計算する（専用の保存キーなし＝遡及・整合・復元が無料）。
 *  - 「新規解除の祝賀」のみ表示済みIDを denken:badges に持つ（app.ts 側）。
 * DOM 非依存でテスト可能。日境界・時刻は JST。
 */
import { dayIndexOf, JST_OFFSET_MS, maxConsecutiveCorrect } from "./quests.js";
import { masteredTopics } from "./stats.js";
import type { StorageLike, WebAnswerLog } from "./store.js";

/** 祝賀表示済みの実績ID（再表示を防ぐ）。実績の解除判定そのものはログから導出する。 */
export const BADGES_KEY = "denken:badges";

export function loadSeenBadges(storage: StorageLike): Set<string> {
  const raw = storage.getItem(BADGES_KEY);
  if (!raw) return new Set();
  try {
    const arr = JSON.parse(raw) as unknown;
    return new Set(Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : []);
  } catch {
    console.warn(`[achievements] JSON.parse 失敗: key=${BADGES_KEY}`);
    return new Set();
  }
}

export function saveSeenBadges(storage: StorageLike, ids: ReadonlySet<string>): void {
  try {
    storage.setItem(BADGES_KEY, JSON.stringify([...ids]));
  } catch {
    // 保存不能でも学習は継続させる。
  }
}

export interface AchievementInput {
  logs: readonly WebAnswerLog[];
  /** お守り込みの実効ストリーク（freeze.ts で算出して渡す）。 */
  streakDays: number;
  /** 現在のレベル（xp.ts の levelInfo で算出して渡す）。 */
  level: number;
  /** topic → 科目の対応（problems から topicSubjectMap で作る）。 */
  subjectOf?: ReadonlyMap<string, string>;
  /** お守りで肩代わりした日（「無傷」系実績の判定に使う）。 */
  usedFreezeDays?: readonly number[];
  /** 現在時刻（「現在のストリーク窓」の判定に使う。テストで固定可能）。 */
  nowMs?: number;
  dayOffsetMs?: number;
}

export interface AchievementView {
  id: string;
  icon: string;
  title: string;
  desc: string;
  unlocked: boolean;
}

interface Stats {
  total: number;
  streak: number;
  level: number;
  maxCombo: number;
  distinctTopics: number;
  distinctSubjects: number;
  hasMorning: boolean;
  hasNight: boolean;
  hasComeback: boolean;
  /** ブランク復帰後に7日連続を達成した経験（復帰を「続く力」へ繋げた証）。 */
  hasComebackRun7: boolean;
  hasPerfectDay: boolean;
  /** 現在のストリーク期間中にお守り消費が無いか（無傷系実績）。 */
  noFreezeStreak: boolean;
  /** ひと月（暦月・JST）の最多学習日数。 */
  maxMonthDays: number;
  /** マスター済み論点の数（easy×3）。 */
  masteredCount: number;
}

function jstHour(ms: number, dayOffsetMs: number): number {
  return new Date(ms + dayOffsetMs).getUTCHours();
}

function buildStats(input: AchievementInput): Stats {
  const offset = input.dayOffsetMs ?? JST_OFFSET_MS;
  const logs = [...input.logs].sort((a, b) => a.atMs - b.atMs);
  const topics = new Set<string>();
  const subjects = new Set<string>();
  const byDay = new Map<number, { count: number; correct: number }>();
  let hasMorning = false;
  let hasNight = false;
  for (const l of logs) {
    topics.add(l.topic);
    const s = input.subjectOf?.get(l.topic);
    if (s) subjects.add(s);
    const hour = jstHour(l.atMs, offset);
    if (hour < 7) hasMorning = true;
    if (hour >= 22) hasNight = true;
    const d = dayIndexOf(l.atMs, offset);
    const cur = byDay.get(d) ?? { count: 0, correct: 0 };
    cur.count += 1;
    if (l.correct) cur.correct += 1;
    byDay.set(d, cur);
  }
  // 不死鳥: 3日以上の空白（連続4日番号差）を挟んで学習を再開した経験。
  // 不死鳥・改: その復帰後に7日連続を積み上げた経験（復帰を継続へ繋げた）。
  const dayList = [...byDay.keys()].sort((a, b) => a - b);
  const daySet = new Set(dayList);
  let hasComeback = false;
  let hasComebackRun7 = false;
  for (let i = 1; i < dayList.length; i++) {
    const cur = dayList[i];
    const prev = dayList[i - 1];
    if (cur === undefined || prev === undefined) continue; // ループ境界上、到達しない
    if (cur - prev >= 4) {
      hasComeback = true;
      let run = 1;
      while (daySet.has(cur + run)) run += 1;
      if (run >= 7) hasComebackRun7 = true;
    }
  }
  // パーフェクトデー: 1日5問以上を全問正解。
  let hasPerfectDay = false;
  for (const v of byDay.values()) {
    if (v.count >= 5 && v.correct === v.count) hasPerfectDay = true;
  }
  // 月間皆勤: 暦月（JST）ごとの学習日数の最大値。
  const byMonth = new Map<string, Set<number>>();
  for (const d of dayList) {
    const date = new Date(d * 86_400_000); // 日番号→その日のUTC0時（月の判定にはこれで十分）
    const key = `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
    const set = byMonth.get(key) ?? new Set<number>();
    set.add(d);
    byMonth.set(key, set);
  }
  let maxMonthDays = 0;
  for (const set of byMonth.values()) maxMonthDays = Math.max(maxMonthDays, set.size);
  // 無傷判定は「現在のストリーク窓」のみを見る。過去に一度お守りを使っただけで
  // 永久に取得不能になってはいけない（新しいストリークはまっさらから評価する）。
  const todayIdx = dayIndexOf(input.nowMs ?? Date.now(), offset);
  const anchor = byDay.has(todayIdx) ? todayIdx : todayIdx - 1;
  const windowStart = anchor - Math.max(0, input.streakDays) + 1;
  const freezeInStreak = (input.usedFreezeDays ?? []).some((d) => d >= windowStart && d <= anchor);
  return {
    total: logs.length,
    streak: input.streakDays,
    level: input.level,
    maxCombo: maxConsecutiveCorrect(logs),
    distinctTopics: topics.size,
    distinctSubjects: subjects.size,
    hasMorning,
    hasNight,
    hasComeback,
    hasComebackRun7,
    hasPerfectDay,
    noFreezeStreak: !freezeInStreak,
    maxMonthDays,
    masteredCount: masteredTopics(logs).length,
  };
}

interface AchievementDef {
  id: string;
  icon: string;
  title: string;
  desc: string;
  check: (s: Stats) => boolean;
}

/** 実績カタログ。id は保存（表示済み管理）に使うため変更しない。 */
export const ACHIEVEMENTS: readonly AchievementDef[] = [
  { id: "first", icon: "⚡", title: "はじめの一歩", desc: "はじめて問題を解いた", check: (s) => s.total >= 1 },
  { id: "solve10", icon: "🔟", title: "ウォームアップ", desc: "通算10問に到達", check: (s) => s.total >= 10 },
  { id: "solve50", icon: "💪", title: "五十問の壁", desc: "通算50問に到達", check: (s) => s.total >= 50 },
  { id: "solve100", icon: "💯", title: "百戦錬磨", desc: "通算100問に到達", check: (s) => s.total >= 100 },
  { id: "solve500", icon: "🏔️", title: "五百問登頂", desc: "通算500問に到達", check: (s) => s.total >= 500 },
  { id: "streak7", icon: "🔥", title: "一週間の炎", desc: "7日連続で学習", check: (s) => s.streak >= 7 },
  { id: "streak30", icon: "🌋", title: "一ヶ月の炎", desc: "30日連続で学習", check: (s) => s.streak >= 30 },
  { id: "streak100", icon: "☄️", title: "百日の炎", desc: "100日連続で学習", check: (s) => s.streak >= 100 },
  { id: "combo3", icon: "🎯", title: "三連撃", desc: "3問連続で正解", check: (s) => s.maxCombo >= 3 },
  { id: "combo7", icon: "🏹", title: "七連撃", desc: "7問連続で正解", check: (s) => s.maxCombo >= 7 },
  {
    id: "allsubjects",
    icon: "🌈",
    title: "全科目踏破",
    desc: "6科目すべてで解答",
    check: (s) => s.distinctSubjects >= 6,
  },
  {
    id: "topics30",
    icon: "🗺️",
    title: "論点コレクター",
    desc: "30種類の論点に挑戦",
    check: (s) => s.distinctTopics >= 30,
  },
  { id: "morning", icon: "🌅", title: "朝活マスター", desc: "朝7時前に学習", check: (s) => s.hasMorning },
  { id: "night", icon: "🦉", title: "夜ふくろう", desc: "22時以降に学習", check: (s) => s.hasNight },
  {
    id: "phoenix",
    icon: "🐦‍🔥",
    title: "不死鳥",
    desc: "3日以上のブランクから復帰",
    check: (s) => s.hasComeback,
  },
  {
    id: "perfectday",
    icon: "✨",
    title: "パーフェクトデー",
    desc: "1日5問以上を全問正解",
    check: (s) => s.hasPerfectDay,
  },
  { id: "level10", icon: "🥇", title: "レベル10", desc: "Lv.10 に到達", check: (s) => s.level >= 10 },
  { id: "level40", icon: "👑", title: "電験マイスター", desc: "Lv.40 に到達", check: (s) => s.level >= 40 },
  {
    id: "master1",
    icon: "🎓",
    title: "初マスター",
    desc: "論点を1つマスター（余裕×3）",
    check: (s) => s.masteredCount >= 1,
  },
  {
    id: "nofreeze30",
    icon: "🛡️",
    title: "無傷の三十日",
    desc: "お守りに頼らず30日連続",
    check: (s) => s.streak >= 30 && s.noFreezeStreak,
  },
  {
    id: "month20",
    icon: "📆",
    title: "月間皆勤賞",
    desc: "ひと月に20日学習",
    check: (s) => s.maxMonthDays >= 20,
  },
  {
    id: "phoenix7",
    icon: "🦅",
    title: "不死鳥・改",
    desc: "ブランク復帰後に7日連続",
    check: (s) => s.hasComebackRun7,
  },
];

/** 全実績の解除状況を評価する。 */
export function evaluateAchievements(input: AchievementInput): AchievementView[] {
  const stats = buildStats(input);
  return ACHIEVEMENTS.map((d) => ({
    id: d.id,
    icon: d.icon,
    title: d.title,
    desc: d.desc,
    unlocked: d.check(stats),
  }));
}

// ---- II-145: バッジステータスキャッシュ ----
// ログが追記されたとき（件数・最終ログ時刻の変化）のみ再計算する差分更新キャッシュ。

interface BadgeCache {
  logsLength: number;
  lastLogAtMs: number;
  streakDays: number;
  level: number;
  result: AchievementView[];
}

let _badgeCache: BadgeCache | null = null;

/**
 * evaluateAchievements のメモ化版。
 * ログの件数・最終ログ時刻・streakDays・level が変化したときのみ再計算する。
 * キャッシュヒット時は前回の結果を返す（純粋性は保証される）。
 */
export function evaluateAchievementsCached(input: AchievementInput): AchievementView[] {
  const logs = input.logs;
  const logsLength = logs.length;
  const lastLogAtMs = logsLength > 0 ? (logs[logsLength - 1] as (typeof logs)[number]).atMs : 0;
  if (
    _badgeCache !== null &&
    _badgeCache.logsLength === logsLength &&
    _badgeCache.lastLogAtMs === lastLogAtMs &&
    _badgeCache.streakDays === input.streakDays &&
    _badgeCache.level === input.level
  ) {
    return _badgeCache.result;
  }
  const result = evaluateAchievements(input);
  _badgeCache = { logsLength, lastLogAtMs, streakDays: input.streakDays, level: input.level, result };
  return result;
}

/** バッジキャッシュを強制クリアする（テスト・リセット用）。 */
export function clearBadgeCache(): void {
  _badgeCache = null;
}

/** 解除済みのうち、まだ祝賀していない実績（app.ts が表示済みIDと突き合わせる）。 */
export function newlyUnlocked(views: readonly AchievementView[], seenIds: ReadonlySet<string>): AchievementView[] {
  return views.filter((v) => v.unlocked && !seenIds.has(v.id));
}
