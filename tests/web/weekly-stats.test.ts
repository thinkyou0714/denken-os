import { describe, expect, it } from "vitest";
import {
  allWeeklyQuestsClear,
  dayIndexOf,
  logsOfWeek,
  perfectDayCount,
  WEEKLY_QUEST_COUNT,
  weekIndexOf,
  weeklyQuestStatuses,
  weeklyQuests,
} from "../../web/src/quests.js";
import { getMascotEnabled, setMascotEnabled } from "../../web/src/settings.js";
import { myStats } from "../../web/src/stats.js";
import type { StorageLike, WebAnswerLog } from "../../web/src/store.js";
import { levelInfo, nextTitleFor, totalXp, weeklyBonusXp, xpBySubject, xpForLog } from "../../web/src/xp.js";

const DAY_MS = 86_400_000;
const DAY0 = Date.UTC(2026, 0, 5, 3, 0, 0); // 2026-01-05(月) 12:00 JST

function log(over: Partial<WebAnswerLog> = {}): WebAnswerLog {
  return { topic: "三相交流電力", correct: true, atMs: DAY0, rating: "good", ...over };
}

class MemoryStorage implements StorageLike {
  m = new Map<string, string>();
  getItem(k: string): string | null {
    return this.m.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    this.m.set(k, v);
  }
}

describe("weekIndexOf（JST週番号・月曜はじまり）", () => {
  it("月曜と日曜は同じ週、翌月曜で週が変わる", () => {
    const mon = DAY0; // 2026-01-05 月
    const sun = DAY0 + 6 * DAY_MS; // 2026-01-11 日
    const nextMon = DAY0 + 7 * DAY_MS; // 2026-01-12 月
    expect(weekIndexOf(mon)).toBe(weekIndexOf(sun));
    expect(weekIndexOf(nextMon)).toBe(weekIndexOf(mon) + 1);
  });

  it("日曜23:59と月曜0:00(JST)で週境界が切り替わる", () => {
    const sunLate = Date.UTC(2026, 0, 11, 14, 59); // JST 日曜23:59
    const monStart = Date.UTC(2026, 0, 11, 15, 0); // JST 月曜0:00
    expect(weekIndexOf(monStart)).toBe(weekIndexOf(sunLate) + 1);
  });
});

describe("weeklyQuests（週替わり抽選）", () => {
  it("毎週ちょうど3件・種類は重複しない・決定論", () => {
    for (const w of [2900, 2901, 2950]) {
      const qs = weeklyQuests(w);
      expect(qs).toHaveLength(WEEKLY_QUEST_COUNT);
      expect(new Set(qs.map((q) => q.kind)).size).toBe(WEEKLY_QUEST_COUNT);
      expect(qs).toEqual(weeklyQuests(w));
    }
  });

  it("週が変わると内容が変わりうる（単調防止）", () => {
    const a = JSON.stringify(weeklyQuests(2900));
    const diff = [2901, 2902, 2903, 2904].some((w) => JSON.stringify(weeklyQuests(w)) !== a);
    expect(diff).toBe(true);
  });
});

describe("weeklyQuestStatuses / allWeeklyQuestsClear", () => {
  /** 週内で広く学習した合成ログ（6日×10問・全問正解easy・論点も分散）。 */
  function richWeek(): WebAnswerLog[] {
    const logs: WebAnswerLog[] = [];
    for (let d = 0; d < 6; d++) {
      for (let i = 0; i < 10; i++) {
        logs.push(log({ atMs: DAY0 + d * DAY_MS + i * 60_000, topic: `論点${d}-${i}`, rating: "easy" }));
      }
    }
    return logs;
  }

  it("十分なログで3クエストすべて達成できる", () => {
    const w = weekIndexOf(DAY0);
    const logs = richWeek();
    for (const s of weeklyQuestStatuses(weeklyQuests(w), logs)) {
      expect(s.value).toBeGreaterThanOrEqual(s.quest.target);
      expect(s.done).toBe(true);
    }
    expect(allWeeklyQuestsClear(logs, w)).toBe(true);
  });

  it("ログ0件は未達成", () => {
    expect(allWeeklyQuestsClear([], weekIndexOf(DAY0))).toBe(false);
  });

  it("logsOfWeek は指定週のログのみ時系列で返す", () => {
    const logs = [log({ atMs: DAY0 + 8 * DAY_MS }), log({ atMs: DAY0 + DAY_MS }), log({ atMs: DAY0 })];
    const week = logsOfWeek(logs, weekIndexOf(DAY0));
    expect(week).toHaveLength(2);
    expect(week[0]!.atMs).toBeLessThan(week[1]!.atMs);
  });

  it("perfectDayCount: 5問以上全問正解の日だけ数える", () => {
    const ok = Array.from({ length: 5 }, (_, i) => log({ atMs: DAY0 + i * 1000 }));
    const ng = [
      ...Array.from({ length: 5 }, (_, i) => log({ atMs: DAY0 + DAY_MS + i * 1000 })),
      log({ atMs: DAY0 + DAY_MS + 9000, correct: false, rating: "again" }),
    ];
    expect(perfectDayCount([...ok, ...ng])).toBe(1);
  });
});

describe("weeklyBonusXp / totalXp 統合", () => {
  it("週次全達成で +50 が累計XPに乗る", () => {
    const w = weekIndexOf(DAY0);
    const logs: WebAnswerLog[] = [];
    for (let d = 0; d < 6; d++) {
      for (let i = 0; i < 12; i++) {
        logs.push(log({ atMs: DAY0 + d * DAY_MS + i * 60_000, topic: `論点${d}-${i}`, rating: "easy" }));
      }
    }
    expect(allWeeklyQuestsClear(logs, w)).toBe(true);
    expect(weeklyBonusXp(logs)).toBe(50);
    expect(totalXp(logs)).toBeGreaterThan(logs.reduce((a, l) => a + xpForLog(l), 0));
  });

  it("未達成の週はボーナス0", () => {
    expect(weeklyBonusXp([log()])).toBe(0);
  });
});

describe("xpBySubject（科目別XP）", () => {
  it("topic→科目の対応で集計し、対応が無いログは除外する", () => {
    const map = new Map([
      ["三相交流電力", "理論"],
      ["変圧器効率", "機械"],
    ]);
    const logs = [log(), log({ topic: "変圧器効率" }), log({ topic: "未知の論点" })];
    const out = xpBySubject(logs, map);
    expect(out.get("理論")).toBe(10);
    expect(out.get("機械")).toBe(10);
    expect([...out.keys()]).not.toContain("未知の論点");
  });
});

describe("nextTitleFor / levelInfo.nextTitle（次称号ティーザー）", () => {
  it("次に控える称号としきい値を返す", () => {
    expect(nextTitleFor(1)).toEqual({ level: 2, title: "配線ルーキー" });
    expect(nextTitleFor(14)).toEqual({ level: 16, title: "変圧マイスター" });
  });

  it("最上位到達後は null", () => {
    expect(nextTitleFor(50)).toBeNull();
    expect(levelInfo(10_000_000).nextTitle).toBeNull();
  });

  it("levelInfo に統合されている", () => {
    expect(levelInfo(0).nextTitle).toEqual({ level: 2, title: "配線ルーキー" });
  });
});

describe("myStats（自分の記録）", () => {
  it("学習日数・最高コンボ・1日最多解答・お守り救援を導出する", () => {
    const logs = [
      log({ atMs: DAY0 }),
      log({ atMs: DAY0 + 1000 }),
      log({ atMs: DAY0 + 2000, correct: false, rating: "again" }),
      log({ atMs: DAY0 + DAY_MS }),
    ];
    const st = myStats(logs, [dayIndexOf(DAY0) + 2]);
    expect(st.studyDays).toBe(2);
    expect(st.bestCombo).toBe(2);
    expect(st.bestDayCount).toBe(3);
    expect(st.freezeSaves).toBe(1);
    expect(st.topicsStudied).toBe(1);
  });

  it("空ログはすべて0", () => {
    const st = myStats([], []);
    expect(st.studyDays).toBe(0);
    expect(st.questClearDays).toBe(0);
    expect(st.perfectDays).toBe(0);
  });
});

describe("マスコット表示設定", () => {
  it("既定オン、オフ/オンを永続化", () => {
    const s = new MemoryStorage();
    expect(getMascotEnabled(s)).toBe(true);
    setMascotEnabled(s, false);
    expect(getMascotEnabled(s)).toBe(false);
    setMascotEnabled(s, true);
    expect(getMascotEnabled(s)).toBe(true);
  });
});
