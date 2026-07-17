import { describe, expect, it } from "vitest";
import { FsrsScheduler, reviveCard, toStoredCard } from "../../lib/scheduler/fsrs.js";

describe("FsrsScheduler", () => {
  const now = new Date("2026-01-01T00:00:00.000Z");

  it("正解で次回復習が未来にスケジュールされる", () => {
    const sched = new FsrsScheduler(0.9);
    const card = sched.init(now);
    const next = sched.review(card, "good", now);
    const view = sched.view(next);
    expect(view.dueMs).toBeGreaterThan(now.getTime());
  });

  it("目標保持率を上げると復習間隔が変わる（高い保持率＝短い間隔）", () => {
    const low = new FsrsScheduler(0.8);
    const high = new FsrsScheduler(0.95);
    const intervalLow = low.view(low.review(low.init(now), "good", now)).scheduledDays;
    const intervalHigh = high.view(high.review(high.init(now), "good", now)).scheduledDays;
    // 保持率を上げるほど「忘れる前に」復習させるので間隔は短く（高々同じ）。
    expect(intervalHigh).toBeLessThanOrEqual(intervalLow);
  });

  it("4段階すべての採点を反映でき、again は good より早い再出題になる", () => {
    const s = new FsrsScheduler(0.9);
    const card = s.init(now);
    for (const r of ["again", "hard", "good", "easy"] as const) {
      const view = s.view(s.review(card, r, now));
      expect(view.dueMs).toBeGreaterThanOrEqual(now.getTime());
    }
    const againDue = s.view(s.review(card, "again", now)).dueMs;
    const goodDue = s.view(s.review(card, "good", now)).dueMs;
    expect(againDue).toBeLessThan(goodDue);
  });

  it("view は reps/lapses/stability を数値で射影する", () => {
    const s = new FsrsScheduler();
    const v = s.view(s.review(s.init(now), "again", now));
    expect(v.reps).toBeGreaterThanOrEqual(1);
    expect(v.lapses).toBeGreaterThanOrEqual(0);
    expect(typeof v.stability).toBe("number");
    expect(typeof v.difficulty).toBe("number");
  });

  it("maximumIntervalDays はハードキャップ（easy の +2 日単調性補正でも超えない）", () => {
    // ts-fsrs は maximum_interval クランプ後に Hard<Good<Easy の単調性維持で
    // Good+1/Easy+2 日するため、素のままでは上限を最大2日超える（試験日越えの復習が
    // 組まれてしまう）。ラッパーの due ハードキャップでこれを防ぐ。
    const s = new FsrsScheduler(0.9, 5);
    let card = s.init(now);
    for (let i = 0; i < 6; i++) {
      card = s.review(card, "easy", now);
      expect(s.view(card).dueMs).toBeLessThanOrEqual(now.getTime() + 5 * 24 * 3600_000);
    }
  });

  it("lapse → 再学習 → 復習のサイクルで lapses が増え、その後も正常に間隔が延びる", () => {
    const s = new FsrsScheduler(0.9);
    let card = s.init(now);
    let t = now;
    // 定着させる（good ×3、都度 due 日時まで進める）。
    for (let i = 0; i < 3; i++) {
      card = s.review(card, "good", t);
      t = new Date(s.view(card).dueMs);
    }
    const lapsesBefore = s.view(card).lapses;
    // 忘却（again）→ lapses が増える。
    card = s.review(card, "again", t);
    expect(s.view(card).lapses).toBe(lapsesBefore + 1);
    // 再学習して復習状態へ戻ると、間隔が再び未来へ延びる。
    t = new Date(s.view(card).dueMs);
    card = s.review(card, "good", t);
    t = new Date(s.view(card).dueMs);
    card = s.review(card, "good", t);
    expect(s.view(card).dueMs).toBeGreaterThan(t.getTime());
  });

  // ── Card の永続化境界（serialize/deserialize）──────────────────────────
  describe("toStoredCard / reviveCard（JSON 往復）", () => {
    it("レビュー済み Card が JSON 経由で完全に往復する（due / last_review の Date 復元）", () => {
      const s = new FsrsScheduler(0.9);
      const card = s.review(s.review(s.init(now), "good", now), "hard", now);
      const revived = reviveCard(JSON.parse(JSON.stringify(toStoredCard(card))));
      expect(revived.due.getTime()).toBe(card.due.getTime());
      expect(revived.last_review?.getTime()).toBe(card.last_review?.getTime());
      expect(revived.stability).toBe(card.stability);
      expect(revived.difficulty).toBe(card.difficulty);
      expect(revived.reps).toBe(card.reps);
      expect(revived.lapses).toBe(card.lapses);
      expect(revived.state).toBe(card.state);
      // 往復後の Card はそのままレビューに使える。
      const next = s.review(revived, "good", new Date(revived.due));
      expect(s.view(next).dueMs).toBeGreaterThan(revived.due.getTime());
    });

    it("未レビュー Card（last_review なし）も往復できる", () => {
      const s = new FsrsScheduler();
      const card = s.init(now);
      const revived = reviveCard(JSON.parse(JSON.stringify(toStoredCard(card))));
      expect(revived.due.getTime()).toBe(card.due.getTime());
      expect(revived.last_review).toBeUndefined();
    });
  });
});
