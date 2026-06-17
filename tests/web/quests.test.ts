import { describe, expect, it } from "vitest";
import {
  allQuestsClear,
  DAILY_QUEST_COUNT,
  dailyQuests,
  dayIndexOf,
  logsOfDay,
  logsOfWeek,
  maxConsecutiveCorrect,
  questStatuses,
  weekIndexOf,
  weeklyQuestStatuses,
  weeklyQuests,
} from "../../web/src/quests.js";
import type { WebAnswerLog } from "../../web/src/store.js";

const DAY0 = Date.UTC(2026, 0, 5, 3, 0, 0); // 2026-01-05 12:00 JST
const DAY0_IDX = dayIndexOf(DAY0);

function log(over: Partial<WebAnswerLog> = {}): WebAnswerLog {
  return { topic: "三相交流電力", correct: true, atMs: DAY0, rating: "good", ...over };
}

describe("dailyQuests（日替わり抽選）", () => {
  it("毎日ちょうど3件・種類は重複しない", () => {
    for (const d of [20000, 20001, 20002, 20100]) {
      const qs = dailyQuests(d);
      expect(qs).toHaveLength(DAILY_QUEST_COUNT);
      expect(new Set(qs.map((q) => q.kind)).size).toBe(DAILY_QUEST_COUNT);
    }
  });

  it("同じ日番号なら常に同じ結果（決定論）", () => {
    expect(dailyQuests(20555)).toEqual(dailyQuests(20555));
  });

  it("日が変わると組み合わせ or 目標値が変わる（単調を防ぐ）", () => {
    const a = JSON.stringify(dailyQuests(20000));
    const diff = [20001, 20002, 20003, 20004, 20005].some((d) => JSON.stringify(dailyQuests(d)) !== a);
    expect(diff).toBe(true);
  });

  it("id は日番号を含む（別日の同種クエストと区別できる）", () => {
    for (const q of dailyQuests(20123)) expect(q.id.startsWith("20123-")).toBe(true);
  });

  it("ラベルに目標数が含まれる", () => {
    for (const q of dailyQuests(20042)) expect(q.label).toContain(String(q.target));
  });
});

describe("maxConsecutiveCorrect", () => {
  it("空は0", () => {
    expect(maxConsecutiveCorrect([])).toBe(0);
  });

  it("途中の不正解でリセットされる", () => {
    const logs = [log(), log(), log({ correct: false }), log()];
    expect(maxConsecutiveCorrect(logs)).toBe(2);
  });
});

describe("logsOfDay / questStatuses / allQuestsClear", () => {
  it("指定日のログだけを時系列順で返す", () => {
    const logs = [
      log({ atMs: DAY0 + 5000 }),
      log({ atMs: DAY0 + 1000 }),
      log({ atMs: DAY0 + 86_400_000 }), // 翌日
    ];
    const day = logsOfDay(logs, DAY0_IDX);
    expect(day).toHaveLength(2);
    expect(day[0]!.atMs).toBeLessThan(day[1]!.atMs);
  });

  it("進捗値とdoneが一致する（solve/correct/topics/easy/combo）", () => {
    const quests = dailyQuests(DAY0_IDX);
    const logs: WebAnswerLog[] = [];
    for (let i = 0; i < 12; i++) {
      logs.push(log({ atMs: DAY0 + i * 1000, topic: `論点${i}`, rating: "easy" }));
    }
    for (const s of questStatuses(quests, logs)) {
      expect(s.value).toBeGreaterThanOrEqual(s.quest.target);
      expect(s.done).toBe(true);
    }
  });

  it("ログ0件は全クエスト未達成", () => {
    expect(allQuestsClear([], DAY0_IDX)).toBe(false);
    for (const s of questStatuses(dailyQuests(DAY0_IDX), [])) {
      expect(s.done).toBe(false);
      expect(s.value).toBe(0);
    }
  });

  it("十分な全正解easyログで3クエスト全達成になる", () => {
    const logs: WebAnswerLog[] = [];
    for (let i = 0; i < 12; i++) {
      logs.push(log({ atMs: DAY0 + i * 1000, topic: `論点${i}`, rating: "easy" }));
    }
    expect(allQuestsClear(logs, DAY0_IDX)).toBe(true);
  });
});

describe("週次クエストカードの進捗（回帰: 週インデックスに logsOfDay を渡すバグ）", () => {
  it("logsOfWeek(週idx) はその週のログを返し、進捗が反映される", () => {
    const weekIdx = weekIndexOf(DAY0);
    // 同じ週の別日にまたがる十分な数のログ（週次目標を達成できる量）。
    const logs: WebAnswerLog[] = [];
    for (let d = 0; d < 5; d++) {
      for (let i = 0; i < 12; i++) {
        logs.push(log({ atMs: DAY0 + d * 86_400_000 + i * 1000, topic: `論点${(d * 12 + i) % 16}` }));
      }
    }
    const statuses = weeklyQuestStatuses(weeklyQuests(weekIdx), logsOfWeek(logs, weekIdx));
    // 修正後: 週のログが集計され、少なくとも一部の進捗値が 0 より大きい。
    expect(statuses.some((s) => s.value > 0)).toBe(true);
  });

  it("旧実装（週インデックスに logsOfDay）は空集合になり進捗が常に0だった", () => {
    const weekIdx = weekIndexOf(DAY0);
    const logs: WebAnswerLog[] = [];
    for (let i = 0; i < 30; i++) logs.push(log({ atMs: DAY0 + i * 1000, topic: `論点${i % 16}` }));
    // 週番号(~2900)は日番号(~20600)と一致しないため、logsOfDay(週idx) は必ず空。
    expect(logsOfDay(logs, weekIdx)).toHaveLength(0);
    // 一方 logsOfWeek は当該週のログを拾う。
    expect(logsOfWeek(logs, weekIdx).length).toBeGreaterThan(0);
  });
});
