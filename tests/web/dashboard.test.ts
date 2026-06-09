import { describe, expect, it } from "vitest";
import type { Problem } from "../../lib/engine/schema.js";
import type { FsrsView } from "../../lib/scheduler/fsrs.js";
import { bySubject, byTopic, masteryLevel, overall, recentAccuracy, reviewForecast } from "../../web/src/dashboard.js";
import type { WebAnswerLog } from "../../web/src/store.js";

function log(topic: string, correct: boolean, atMs = 0): WebAnswerLog {
  return { topic, correct, atMs };
}

function prob(id: string, subject: Problem["subject"], topic: string): Problem {
  return {
    id,
    subject,
    topic,
    difficulty: 2,
    statement: "x",
    answer: "1",
    solution: ["1"],
    validation: { solver_checked: true, human_checked: false, clean_answer: true, physically_valid: true },
    source: { type: "original" },
  };
}

const problems: Problem[] = [
  prob("A", "理論", "三相交流電力"),
  prob("B", "電力", "需要率"),
  prob("C", "機械", "誘導電動機の回転速度"),
];

describe("dashboard（進捗集計）", () => {
  it("overall: 全体の試行・正答・正答率・学習論点数", () => {
    const logs = [log("三相交流電力", true), log("三相交流電力", false), log("需要率", true)];
    const o = overall(logs);
    expect(o.attempts).toBe(3);
    expect(o.correct).toBe(2);
    expect(o.accuracy).toBeCloseTo(2 / 3);
    expect(o.topicsStudied).toBe(2);
  });

  it("recentAccuracy: 直近 n 件の正答率", () => {
    const logs = [log("t", false), log("t", true), log("t", true)];
    expect(recentAccuracy(logs, 2)).toBe(1); // 直近2件は両方正解
    expect(recentAccuracy(logs, 3)).toBeCloseTo(2 / 3);
    expect(recentAccuracy([], 5)).toBe(0);
  });

  it("bySubject: 6科目を固定順で返し、未学習科目も0で含む", () => {
    const logs = [log("三相交流電力", true), log("三相交流電力", true), log("需要率", false)];
    const rows = bySubject(logs, problems);
    expect(rows.map((r) => r.subject)).toEqual(["理論", "電力", "機械", "法規", "電力管理", "機械制御"]);
    const riron = rows.find((r) => r.subject === "理論")!;
    expect(riron.attempts).toBe(2);
    expect(riron.accuracy).toBe(1);
    expect(rows.find((r) => r.subject === "法規")!.attempts).toBe(0);
  });

  it("byTopic: 正答率の低い順（弱点順）", () => {
    const logs = [log("強", true), log("強", true), log("弱", false), log("弱", true)];
    const rows = byTopic(logs);
    expect(rows[0]?.topic).toBe("弱"); // 正答率0.5 が先頭
    expect(rows[1]?.topic).toBe("強");
  });

  it("masteryLevel: 試行数と正答率から到達度を判定", () => {
    expect(masteryLevel({ attempts: 0, correct: 0, accuracy: 0 })).toBe("未学習");
    expect(masteryLevel({ attempts: 2, correct: 2, accuracy: 1 })).toBe("要復習"); // 試行不足
    expect(masteryLevel({ attempts: 5, correct: 2, accuracy: 0.4 })).toBe("要復習");
    expect(masteryLevel({ attempts: 5, correct: 4, accuracy: 0.8 })).toBe("習得中");
    expect(masteryLevel({ attempts: 10, correct: 9, accuracy: 0.9 })).toBe("習得");
  });

  it("reviewForecast: due を日別に集計（期限超過は今日に算入）", () => {
    const DAY = 86_400_000;
    const now = 100 * DAY + 5_000_000; // 適当な now
    const views: FsrsView[] = [
      { dueMs: now - DAY, stability: 1, difficulty: 1, reps: 1, lapses: 0, scheduledDays: 1 }, // 期限超過→今日
      { dueMs: now + 2 * DAY, stability: 1, difficulty: 1, reps: 1, lapses: 0, scheduledDays: 1 },
      { dueMs: now + 100 * DAY, stability: 1, difficulty: 1, reps: 1, lapses: 0, scheduledDays: 1 }, // 範囲外
    ];
    const fc = reviewForecast(views, now, 7);
    expect(fc.length).toBe(7);
    expect(fc[0]).toBe(1); // 期限超過分
    expect(fc[2]).toBe(1);
    expect(fc.reduce((a, b) => a + b, 0)).toBe(2); // 範囲外は除外
  });

  it("reviewForecast: JST 日境界で集計する（23時JSTの翌0時JST due は『今日』でなく+1）", () => {
    const now = Date.UTC(2026, 5, 9, 14, 0); // 2026-06-09 23:00 JST
    const due = Date.UTC(2026, 5, 9, 15, 0); // 2026-06-10 00:00 JST（翌JST日）
    const views: FsrsView[] = [{ dueMs: due, stability: 1, difficulty: 1, reps: 1, lapses: 0, scheduledDays: 1 }];
    const fc = reviewForecast(views, now, 7);
    expect(fc[0]).toBe(0); // 今日には入らない
    expect(fc[1]).toBe(1); // 翌日(+1)に入る
  });
});
