import { describe, expect, it } from "vitest";
import {
  CRAM_REVIEW_CAP_MAX,
  CRAM_REVIEW_CAP_MULT,
  DEFAULT_DAILY_REVIEW_CAP,
  dailyReviewBatch,
  effectiveReviewCap,
  JST_OFFSET_MS,
  offlineLabel,
  streakStatus,
} from "../../web/src/retention.js";
import type { WebAnswerLog } from "../../web/src/store.js";

const DAY = 86_400_000;
/** JST 正午の epoch ms（日境界の端で揺れないよう昼に置く）。 */
function jstNoon(dayIndex: number): number {
  return dayIndex * DAY + 12 * 3600_000 - JST_OFFSET_MS;
}
const log = (atMs: number): WebAnswerLog => ({ topic: "t", correct: true, atMs });

describe("dailyReviewBatch（復習の1日上限バッチ化）", () => {
  const due = Array.from({ length: 50 }, (_, i) => `topic-${i}`);

  it("上限で切り、overflow を返す", () => {
    const r = dailyReviewBatch(due, 30);
    expect(r.batch.length).toBe(30);
    expect(r.overflow).toBe(20);
    expect(r.capped).toBe(true);
    expect(r.batch[0]).toBe("topic-0"); // due 順を保持
  });

  it("上限以下なら全件・capped=false", () => {
    const r = dailyReviewBatch(due.slice(0, 10), 30);
    expect(r.batch.length).toBe(10);
    expect(r.overflow).toBe(0);
    expect(r.capped).toBe(false);
  });

  it("今日すでにこなした分を残り枠から差し引く", () => {
    const r = dailyReviewBatch(due, 30, 25);
    expect(r.batch.length).toBe(5);
    expect(r.remaining).toBe(5);
  });

  it("残り枠ゼロなら空バッチ", () => {
    const r = dailyReviewBatch(due, 30, 40);
    expect(r.batch).toEqual([]);
    expect(r.overflow).toBe(50);
  });

  it("既定上限は 30", () => {
    expect(DEFAULT_DAILY_REVIEW_CAP).toBe(30);
  });
});

describe("streakStatus（ストリーク状態判定）", () => {
  const today = 20_000; // 任意の日番号

  it("履歴なしは none", () => {
    expect(streakStatus([]).state).toBe("none");
  });

  it("今日学習済みは active で連続日数を数える", () => {
    const logs = [today, today - 1, today - 2].map((d) => log(jstNoon(d)));
    const s = streakStatus(logs, jstNoon(today));
    expect(s.state).toBe("active");
    expect(s.days).toBe(3);
  });

  it("昨日までで今日未学習は at-risk（崩れる予兆）", () => {
    const logs = [today - 1, today - 2].map((d) => log(jstNoon(d)));
    const s = streakStatus(logs, jstNoon(today));
    expect(s.state).toBe("at-risk");
    expect(s.days).toBe(2);
    expect(s.message).toContain("途切れ");
  });

  it("一昨日以前が最後なら broken", () => {
    const s = streakStatus([log(jstNoon(today - 3))], jstNoon(today));
    expect(s.state).toBe("broken");
    expect(s.days).toBe(0);
  });

  it("お守りで肩代わりした日（extraDays）を学習日として連続に数える", () => {
    // 昨日(today-1)を欠席したがお守りでカバー → at-risk のまま連続日数は維持される。
    const logs = [today - 2, today - 3].map((d) => log(jstNoon(d)));
    const noFreeze = streakStatus(logs, jstNoon(today));
    expect(noFreeze.state).toBe("broken");
    const withFreeze = streakStatus(logs, jstNoon(today), JST_OFFSET_MS, new Set([today - 1]));
    expect(withFreeze.state).toBe("at-risk");
    expect(withFreeze.days).toBe(3);
  });
});

describe("offlineLabel", () => {
  it("オンラインは空、オフラインはラベル", () => {
    expect(offlineLabel(true)).toBe("");
    expect(offlineLabel(false)).toContain("オフライン");
  });
});

describe("effectiveReviewCap（直前モードの上限引き上げ・#64）", () => {
  it("通常時は設定値そのまま", () => {
    expect(effectiveReviewCap(30, false)).toBe(30);
    expect(effectiveReviewCap(50, false)).toBe(50);
  });

  it("直前モードは上限を倍にする", () => {
    expect(effectiveReviewCap(30, true)).toBe(30 * CRAM_REVIEW_CAP_MULT);
  });

  it("直前モードでも絶対上限でクランプする", () => {
    expect(effectiveReviewCap(200, true)).toBe(CRAM_REVIEW_CAP_MAX);
  });

  it("不正値は最低1に丸める", () => {
    expect(effectiveReviewCap(0, false)).toBe(1);
    expect(effectiveReviewCap(-5, false)).toBe(1);
  });
});
