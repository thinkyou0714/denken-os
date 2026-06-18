import { describe, expect, it } from "vitest";
import { dailyQuests, QUEST_CLEAR_BONUS_XP } from "../../web/src/quests.js";
import type { WebAnswerLog } from "../../web/src/store.js";
import {
  comboBonus,
  LEVEL_CAP,
  levelInfo,
  questBonusXp,
  titleForLevel,
  totalXp,
  XP_BY_RATING,
  xpByDay,
  xpForLog,
  xpFromLogs,
  xpNeededFor,
} from "../../web/src/xp.js";

const JST = 9 * 3600_000;
/** JST の同一日内に収まる時刻を作る（2026-01-05 12:00 JST 基準）。 */
const DAY0 = Date.UTC(2026, 0, 5, 3, 0, 0); // = 2026-01-05 12:00 JST

function log(over: Partial<WebAnswerLog> = {}): WebAnswerLog {
  return { topic: "三相交流電力", correct: true, atMs: DAY0, rating: "good", ...over };
}

describe("xpForLog（評価別の基礎XP・#51 報酬再設計）", () => {
  it("正解の自己評価はほぼ同額で、easy を最大にしない（インフレ防止）", () => {
    // 不正解(again) < 正解の各評価。
    expect(XP_BY_RATING.again).toBeLessThan(XP_BY_RATING.easy);
    expect(XP_BY_RATING.again).toBeLessThan(XP_BY_RATING.good);
    expect(XP_BY_RATING.again).toBeLessThan(XP_BY_RATING.hard);
    // 旧設計の弊害を断つ: easy は最大ではない（楽勝申告が最も得にならない）。
    expect(XP_BY_RATING.easy).toBeLessThanOrEqual(XP_BY_RATING.good);
    expect(XP_BY_RATING.easy).toBeLessThanOrEqual(XP_BY_RATING.hard);
    // 努力して想起できた hard は easy 以上に報われる。
    expect(XP_BY_RATING.hard).toBeGreaterThanOrEqual(XP_BY_RATING.easy);
    // 正解どうしの差は小さい（±2以内）。
    const correctVals = [XP_BY_RATING.hard, XP_BY_RATING.good, XP_BY_RATING.easy];
    expect(Math.max(...correctVals) - Math.min(...correctVals)).toBeLessThanOrEqual(2);
  });

  it("不正解にも参加報酬がある（0にしない＝挑戦を罰しない）", () => {
    expect(xpForLog(log({ correct: false, rating: "again" }))).toBeGreaterThan(0);
  });

  it("旧ログ（rating なし）は correct から good/again に写像する", () => {
    const withoutRating = (correct: boolean): WebAnswerLog => {
      const l = log({ correct });
      delete (l as Partial<WebAnswerLog>).rating;
      return l;
    };
    expect(xpForLog(withoutRating(true))).toBe(XP_BY_RATING.good);
    expect(xpForLog(withoutRating(false))).toBe(XP_BY_RATING.again);
  });
});

describe("comboBonus（連続正解ボーナス）", () => {
  it("1問目は0・2連続目から+1・上限+5", () => {
    expect(comboBonus(1)).toBe(0);
    expect(comboBonus(2)).toBe(1);
    expect(comboBonus(3)).toBe(2);
    expect(comboBonus(6)).toBe(5);
    expect(comboBonus(100)).toBe(5);
  });
});

describe("xpFromLogs（基礎＋コンボ）", () => {
  it("空ログは0", () => {
    expect(xpFromLogs([])).toBe(0);
  });

  it("同日内の連続正解にボーナスが付く", () => {
    const logs = [log({ atMs: DAY0 }), log({ atMs: DAY0 + 1000 }), log({ atMs: DAY0 + 2000 })];
    // good×3 ＋ コンボ(0,+1,+2)
    expect(xpFromLogs(logs)).toBe(XP_BY_RATING.good * 3 + 0 + 1 + 2);
  });

  it("不正解でコンボが途切れる", () => {
    const logs = [
      log({ atMs: DAY0 }),
      log({ atMs: DAY0 + 1000, correct: false, rating: "again" }),
      log({ atMs: DAY0 + 2000 }),
    ];
    // good + again + good（コンボボーナスなし: 連続が1問ずつ）
    expect(xpFromLogs(logs)).toBe(XP_BY_RATING.good + XP_BY_RATING.again + XP_BY_RATING.good);
  });

  it("コンボは日をまたがない（JST日境界でリセット）", () => {
    const nextDay = DAY0 + 86_400_000;
    const logs = [log({ atMs: DAY0 }), log({ atMs: DAY0 + 1000 }), log({ atMs: nextDay })];
    // day1: good + (good+1), day2: good（リセットでボーナス0）
    expect(xpFromLogs(logs)).toBe(XP_BY_RATING.good * 3 + 1);
  });

  it("ログ順序が乱れていても時系列に並べて計算する", () => {
    const a = log({ atMs: DAY0 + 2000 });
    const b = log({ atMs: DAY0 });
    const c = log({ atMs: DAY0 + 1000 });
    expect(xpFromLogs([a, b, c])).toBe(xpFromLogs([b, c, a]));
  });
});

describe("questBonusXp / totalXp", () => {
  it("クエスト未達成の日はボーナス0", () => {
    expect(questBonusXp([log()])).toBe(0);
  });

  it("3クエスト全達成の日に +QUEST_CLEAR_BONUS_XP", () => {
    // その日のクエストを取得し、確実に全達成するログを合成する。
    const dayIndex = Math.floor((DAY0 + JST) / 86_400_000);
    const quests = dailyQuests(dayIndex);
    const need = Math.max(10, ...quests.map((q) => q.target));
    const logs: WebAnswerLog[] = [];
    for (let i = 0; i < need; i++) {
      logs.push(log({ atMs: DAY0 + i * 1000, topic: `論点${i}`, rating: "easy", correct: true }));
    }
    expect(questBonusXp(logs)).toBe(QUEST_CLEAR_BONUS_XP);
    expect(totalXp(logs)).toBe(xpFromLogs(logs) + QUEST_CLEAR_BONUS_XP);
  });
});

describe("levelInfo（レベル曲線と称号）", () => {
  it("XP 0 は Lv.1 見習い電気係", () => {
    const info = levelInfo(0);
    expect(info.level).toBe(1);
    expect(info.title).toBe("見習い電気係");
    expect(info.xpInto).toBe(0);
    expect(info.progress).toBe(0);
  });

  it("レベル必要XPは単調増加（序盤が軽い）", () => {
    expect(xpNeededFor(1)).toBeLessThan(xpNeededFor(2));
    expect(xpNeededFor(10)).toBeLessThan(xpNeededFor(20));
  });

  it("しきい値ちょうどでレベルアップする", () => {
    const need1 = xpNeededFor(1);
    expect(levelInfo(need1 - 1).level).toBe(1);
    expect(levelInfo(need1).level).toBe(2);
  });

  it("負値・小数は安全に扱う", () => {
    expect(levelInfo(-100).level).toBe(1);
    expect(levelInfo(45.9).level).toBe(2);
  });

  it("レベル上限で頭打ちになり progress=1", () => {
    const info = levelInfo(10_000_000);
    expect(info.level).toBe(LEVEL_CAP);
    expect(info.progress).toBe(1);
  });

  it("称号はしきい値の最高位を維持する", () => {
    expect(titleForLevel(1)).toBe("見習い電気係");
    expect(titleForLevel(4)).toBe("テスター使い");
    expect(titleForLevel(40)).toBe("電験マイスター");
    expect(titleForLevel(99)).toBe("レジェンド主任技術者");
  });
});

describe("xpByDay（週間XPチャート）", () => {
  it("日別に集計され、学習なしの日は0", () => {
    const logs = [log({ atMs: DAY0 }), log({ atMs: DAY0 + 1000 })];
    const out = xpByDay(logs, 7, DAY0 + 2 * 86_400_000);
    expect(out).toHaveLength(7);
    expect(out[4]).toBe(XP_BY_RATING.good * 2 + 1); // good + (good+1)
    expect(out[5]).toBe(0);
    expect(out[6]).toBe(0);
  });

  it("範囲外（古すぎ・未来）のログは含めない", () => {
    const logs = [log({ atMs: DAY0 - 30 * 86_400_000 }), log({ atMs: DAY0 + 30 * 86_400_000 })];
    expect(xpByDay(logs, 7, DAY0).every((v) => v === 0)).toBe(true);
  });
});
