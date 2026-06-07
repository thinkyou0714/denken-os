/**
 * SCHED-LEECH-DETECT: lapses 閾値で leech を検出する純関数。
 */
import { describe, expect, it } from "vitest";
import { DEFAULT_LEECH_POLICY, isLeech, leechSeverity } from "../../lib/scheduler/leech.js";

describe("leech 検出", () => {
  it("既定閾値(8)で境界を判定する", () => {
    expect(isLeech({ lapses: 7 })).toBe(false);
    expect(isLeech({ lapses: 8 })).toBe(true);
    expect(DEFAULT_LEECH_POLICY.lapseThreshold).toBe(8);
  });

  it("severity は none/leech/severe の3段階", () => {
    expect(leechSeverity({ lapses: 0 })).toBe("none");
    expect(leechSeverity({ lapses: 8 })).toBe("leech");
    expect(leechSeverity({ lapses: 15 })).toBe("leech");
    expect(leechSeverity({ lapses: 16 })).toBe("severe");
  });

  it("閾値はポリシーで上書きできる", () => {
    expect(isLeech({ lapses: 4 }, { lapseThreshold: 4 })).toBe(true);
    expect(isLeech({ lapses: 3 }, { lapseThreshold: 4 })).toBe(false);
  });
});
