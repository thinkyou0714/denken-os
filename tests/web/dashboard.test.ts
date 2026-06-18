import { describe, expect, it } from "vitest";
import type { Problem } from "../../lib/engine/schema.js";
import type { FsrsView } from "../../lib/scheduler/fsrs.js";
import {
  accuracyTrend,
  allSubjectReadiness,
  bySubject,
  byTopic,
  dailyActivity,
  masteryLevel,
  overall,
  recentAccuracy,
  reviewForecast,
  subjectReadiness,
} from "../../web/src/dashboard.js";
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

  it("accuracyTrend: 時系列チャンクごとの正答率（0..1）を返す", () => {
    const logs = [log("t", false, 1), log("t", true, 2), log("t", true, 3), log("t", false, 4)];
    expect(accuracyTrend(logs, 4)).toEqual([0, 1, 1, 0]);
    expect(accuracyTrend([], 8)).toEqual([]);
    // 8件・segments4 → 2件ずつ4チャンク
    const eight = [1, 2, 3, 4, 5, 6, 7, 8].map((i) => log("t", i % 2 === 0, i));
    expect(accuracyTrend(eight, 4).length).toBe(4);
  });

  it("dailyActivity: 直近 days 日の日別学習量を古い順→今日で返す", () => {
    const DAY = 86_400_000;
    const now = Date.UTC(2026, 5, 9, 3, 0); // JST 正午相当
    const logs = [
      log("t", true, now), // 今日
      log("t", true, now), // 今日（2件）
      log("t", false, now - 2 * DAY), // 2日前
    ];
    const act = dailyActivity(logs, 3, now);
    expect(act.map((a) => a.offset)).toEqual([-2, -1, 0]);
    expect(act[0]?.count).toBe(1); // 2日前
    expect(act[1]?.count).toBe(0); // 昨日
    expect(act[2]?.count).toBe(2); // 今日
  });
});

describe("subjectReadiness（科目別 合格見込みの推定・#52）", () => {
  // 理論に2論点ある問題集（カバレッジを測れるようにする）。
  const probs: Problem[] = [
    prob("R1", "理論", "三相交流電力"),
    prob("R2", "理論", "オームの法則"),
    prob("D1", "電力", "需要率"),
  ];

  it("未着手の科目は『遅れ』・readiness 0 近傍", () => {
    const r = subjectReadiness("電力", [], probs, 90);
    expect(r.attempts).toBe(0);
    expect(r.verdict).toBe("遅れ");
  });

  it("高正答率＋全論点カバーは『順調』", () => {
    // 理論の2論点を高正答率で多数こなす。
    const logs: WebAnswerLog[] = [];
    for (let i = 0; i < 8; i++) logs.push(log("三相交流電力", true, i));
    for (let i = 0; i < 8; i++) logs.push(log("オームの法則", true, 100 + i));
    const r = subjectReadiness("理論", logs, probs, 90);
    expect(r.coverage).toBe(1); // 2/2 論点
    expect(r.accuracy).toBeGreaterThan(0.8);
    expect(r.verdict).toBe("順調");
    expect(r.readiness).toBeGreaterThan(0.6);
  });

  it("低正答率は readiness が下がる", () => {
    const logs: WebAnswerLog[] = [];
    for (let i = 0; i < 8; i++) logs.push(log("三相交流電力", false, i)); // 全外し
    const r = subjectReadiness("理論", logs, probs, 90);
    expect(r.accuracy).toBeLessThan(0.4);
    expect(r.readiness).toBeLessThan(0.5);
    expect(r.verdict).not.toBe("順調");
  });

  it("残り日数が少ないほど判定が厳しくなる（同じ実力でも直前は順調になりにくい）", () => {
    const logs: WebAnswerLog[] = [];
    // 1論点だけ・そこそこの正答率（カバレッジ0.5）。
    for (let i = 0; i < 6; i++) logs.push(log("三相交流電力", i % 3 !== 0, i)); // 約67%
    const far = subjectReadiness("理論", logs, probs, 120);
    const near = subjectReadiness("理論", logs, probs, 7);
    // readiness 自体は同じ（実力は同じ）。判定の厳しさだけが変わる。
    expect(near.readiness).toBeCloseTo(far.readiness);
    const rank = (v: string) => (v === "順調" ? 2 : v === "もう少し" ? 1 : 0);
    expect(rank(near.verdict)).toBeLessThanOrEqual(rank(far.verdict));
  });

  it("allSubjectReadiness: 問題集に存在する科目だけを返す", () => {
    const rows = allSubjectReadiness([], probs, 90);
    expect(rows.map((r) => r.subject).sort()).toEqual(["理論", "電力"].sort());
  });

  it("readiness は 0..1 にクランプされる", () => {
    const logs: WebAnswerLog[] = [];
    for (let i = 0; i < 20; i++) logs.push(log("三相交流電力", true, i));
    for (let i = 0; i < 20; i++) logs.push(log("オームの法則", true, 100 + i));
    const r = subjectReadiness("理論", logs, probs, 90);
    expect(r.readiness).toBeGreaterThanOrEqual(0);
    expect(r.readiness).toBeLessThanOrEqual(1);
  });
});
