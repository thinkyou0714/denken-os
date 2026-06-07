/**
 * SCHED-4LEVEL-RATING: 解答時間から4段階 Rating を導く。
 */
import { describe, expect, it } from "vitest";
import { deriveRating } from "../../lib/scheduler/rating.js";

describe("deriveRating", () => {
  it("不正解は常に again", () => {
    expect(deriveRating(false)).toBe("again");
    expect(deriveRating(false, 1000)).toBe("again");
  });

  it("timeMs 欠落の正解は good", () => {
    expect(deriveRating(true)).toBe("good");
  });

  it("速い正解=easy / 遅い正解=hard / 中間=good", () => {
    expect(deriveRating(true, 3000)).toBe("easy"); // < 8s
    expect(deriveRating(true, 30000)).toBe("hard"); // > 25s
    expect(deriveRating(true, 15000)).toBe("good"); // 中間
  });

  it("閾値は引数で調整できる", () => {
    expect(deriveRating(true, 5000, 4000, 10000)).toBe("good"); // fast=4s なので 5s は good
  });
});
