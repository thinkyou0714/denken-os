import { describe, it, expect } from "vitest";
import { State } from "ts-fsrs";
import { newCard, review, retrievability, isDue } from "@/domain/srs/scheduler";

describe("FSRS スケジューラ", () => {
  it("新規カードは即座に復習対象", () => {
    const card = newCard(new Date("2026-01-01T00:00:00Z"));
    expect(card.state).toBe(State.New);
    expect(isDue(card, new Date("2026-01-01T00:00:00Z"))).toBe(true);
  });

  it("null カード(未学習)は常に復習対象", () => {
    expect(isDue(null)).toBe(true);
  });

  it("'good' 評価で次回期限が未来に延びる", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const card = newCard(now);
    const { card: next } = review(card, "good", now);
    expect(new Date(next.due).getTime()).toBeGreaterThan(now.getTime());
    expect(next.reps).toBeGreaterThan(0);
  });

  it("'again' より 'easy' の方が次回間隔が長い", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const base = newCard(now);
    const again = review(base, "again", now).card;
    const easy = review(base, "easy", now).card;
    expect(new Date(easy.due).getTime()).toBeGreaterThan(
      new Date(again.due).getTime(),
    );
  });

  it("retrievability は 0〜1 を返し、新規カードは 0", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const card = newCard(now);
    expect(retrievability(card, now)).toBe(0);
    const reviewed = review(card, "good", now).card;
    const r = retrievability(reviewed, now);
    expect(r).toBeGreaterThanOrEqual(0);
    expect(r).toBeLessThanOrEqual(1);
  });
});
