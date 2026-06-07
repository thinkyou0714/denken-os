/**
 * SCHED-LAPSE-QUEUE: 問題単位の relearning キュー（純関数）。
 */
import { describe, expect, it } from "vitest";
import { dueLapseIds, type LapseMap, RELEARN_MS, updateLapse } from "../../lib/scheduler/lapse-queue.js";

describe("updateLapse", () => {
  it("誤答は now+RELEARN_MS に再出題予定を積む", () => {
    const m = updateLapse({}, "P1", false, 1000);
    expect(m.P1).toBe(1000 + RELEARN_MS);
  });

  it("正解は卒業（削除）する", () => {
    const m = updateLapse({ P1: 5000 }, "P1", true, 1000);
    expect("P1" in m).toBe(false);
  });

  it("入力を破壊しない（純関数）", () => {
    const src: LapseMap = { P1: 5000 };
    updateLapse(src, "P2", false, 1000);
    expect(src).toEqual({ P1: 5000 });
  });
});

describe("dueLapseIds", () => {
  it("予定到来済みのみを古い順に返す", () => {
    const map: LapseMap = { A: 100, B: 50, C: 9999 };
    expect(dueLapseIds(map, 200)).toEqual(["B", "A"]); // C は未来
  });
});
