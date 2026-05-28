import { describe, it, expect } from "vitest";
import { shouldRecommendBreak } from "@/domain/gamification/break";

describe("shouldRecommendBreak", () => {
  it("開始直後は推奨しない", () => {
    const t0 = new Date("2026-05-28T10:00:00Z");
    const t = new Date("2026-05-28T10:05:00Z"); // 5min
    expect(shouldRecommendBreak(t0, t)).toBe(false);
  });

  it("15 分経過で推奨する", () => {
    const t0 = new Date("2026-05-28T10:00:00Z");
    const t = new Date("2026-05-28T10:15:30Z");
    expect(shouldRecommendBreak(t0, t)).toBe(true);
  });

  it("閾値を指定すれば短くも長くもできる", () => {
    const t0 = new Date("2026-05-28T10:00:00Z");
    const t = new Date("2026-05-28T10:10:00Z");
    expect(shouldRecommendBreak(t0, t, 5)).toBe(true);
    expect(shouldRecommendBreak(t0, t, 30)).toBe(false);
  });
});
