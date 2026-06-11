/**
 * quests.ts — デイリークエスト（純ロジック）。
 *
 * Duolingo 型の継続設計: 単一の「1日N問」目標だけだと飽きるため、日替わりで
 * 3つの小目標（解答数/正解数/連続正解/論点の幅/自信評価）を出す。
 *  - 抽選は JST 日番号を種にした決定論 PRNG（端末・時刻に依らず同じ日は同じクエスト）。
 *  - 進捗は当日の解答ログだけから計算する（追加の保存キー不要・過去日も再計算可能）。
 *    これにより XP のクエストボーナスも完全に決定論で導出できる。
 * DOM 非依存でテスト可能。日境界は store.ts / retention.ts と同じ JST(UTC+9)。
 */
import type { WebAnswerLog } from "./store.js";

const DAY_MS = 86_400_000;
/** 既定の日境界は日本標準時(UTC+9)。store.ts / retention.ts と揃える。 */
export const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** epoch ms を JST 日番号へ（クエストの抽選種・当日判定に使う）。 */
export function dayIndexOf(ms: number, dayOffsetMs: number = JST_OFFSET_MS): number {
  return Math.floor((ms + dayOffsetMs) / DAY_MS);
}

export type QuestKind = "solve" | "correct" | "combo" | "topics" | "easy";

export interface Quest {
  /** `${dayIndex}-${kind}` 形式（日をまたぐと別IDになる）。 */
  id: string;
  kind: QuestKind;
  target: number;
  icon: string;
  label: string;
}

export interface QuestStatus {
  quest: Quest;
  /** 現在の達成値（target でクリップしない生値）。 */
  value: number;
  done: boolean;
}

interface QuestTemplate {
  kind: QuestKind;
  icon: string;
  targets: readonly number[];
  label: (t: number) => string;
}

/** クエストの種類。すべて「当日のログだけ」で進捗判定できるものに限定する
 *  （問題データの有無や設定に依存すると XP 導出が非決定論になるため）。 */
const TEMPLATES: readonly QuestTemplate[] = [
  { kind: "solve", icon: "✏️", targets: [5, 8, 10], label: (t) => `問題を ${t} 問解く` },
  { kind: "correct", icon: "⭕", targets: [3, 5, 7], label: (t) => `${t} 問正解する` },
  { kind: "combo", icon: "⚡", targets: [3, 4, 5], label: (t) => `${t} 連続で正解する` },
  { kind: "topics", icon: "🗺️", targets: [2, 3, 4], label: (t) => `${t} 種類の論点に挑戦する` },
  { kind: "easy", icon: "😎", targets: [1, 2, 3], label: (t) => `「余裕」評価を ${t} 回つける` },
];

/** 1日に出すクエスト数。3つ＝「全部できそう」と思える量（多いと圧迫、少ないと単調）。 */
export const DAILY_QUEST_COUNT = 3;
/** 3クエスト全達成のボーナスXP（xp.ts が日次で加算する）。 */
export const QUEST_CLEAR_BONUS_XP = 20;

/** mulberry32 — 小さく決定論な PRNG（日替わり抽選用）。 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** その日のデイリークエスト3件（決定論）。同じ dayIndex なら常に同じ結果。 */
export function dailyQuests(dayIndex: number): Quest[] {
  const rng = mulberry32(dayIndex ^ 0x9e3779b9);
  // テンプレートの並びを Fisher–Yates でシャッフルし、先頭3種を採用する。
  const order = TEMPLATES.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  return order.slice(0, DAILY_QUEST_COUNT).map((idx) => {
    const tpl = TEMPLATES[idx]!;
    const target = tpl.targets[Math.floor(rng() * tpl.targets.length)]!;
    return { id: `${dayIndex}-${tpl.kind}`, kind: tpl.kind, target, icon: tpl.icon, label: tpl.label(target) };
  });
}

/** ログ列の中での最大連続正解数（時系列順を仮定）。 */
export function maxConsecutiveCorrect(logs: readonly WebAnswerLog[]): number {
  let best = 0;
  let run = 0;
  for (const l of logs) {
    run = l.correct ? run + 1 : 0;
    if (run > best) best = run;
  }
  return best;
}

/** 指定日のログだけを時系列順で取り出す。 */
export function logsOfDay(
  logs: readonly WebAnswerLog[],
  dayIndex: number,
  dayOffsetMs: number = JST_OFFSET_MS,
): WebAnswerLog[] {
  return logs.filter((l) => dayIndexOf(l.atMs, dayOffsetMs) === dayIndex).sort((a, b) => a.atMs - b.atMs);
}

/** クエスト1件の達成値を当日ログから計算する。 */
function questValue(quest: Quest, dayLogs: readonly WebAnswerLog[]): number {
  switch (quest.kind) {
    case "solve":
      return dayLogs.length;
    case "correct":
      return dayLogs.filter((l) => l.correct).length;
    case "combo":
      return maxConsecutiveCorrect(dayLogs);
    case "topics":
      return new Set(dayLogs.map((l) => l.topic)).size;
    case "easy":
      return dayLogs.filter((l) => l.rating === "easy").length;
  }
}

/** 当日クエストの進捗一覧。 */
export function questStatuses(quests: readonly Quest[], dayLogs: readonly WebAnswerLog[]): QuestStatus[] {
  return quests.map((quest) => {
    const value = questValue(quest, dayLogs);
    return { quest, value, done: value >= quest.target };
  });
}

/** その日の3クエストをすべて達成したか（XPボーナス・祝賀の判定）。 */
export function allQuestsClear(dayLogs: readonly WebAnswerLog[], dayIndex: number): boolean {
  if (dayLogs.length === 0) return false;
  return questStatuses(dailyQuests(dayIndex), dayLogs).every((s) => s.done);
}
