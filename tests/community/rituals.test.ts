import { describe, expect, it } from "vitest";
import {
  checkinMessage,
  graduationRole,
  type MemberActivity,
  returningWelcome,
  selectReturningMembers,
} from "../../lib/community/rituals.js";

describe("コミュニティ儀式（08）", () => {
  it("チェックインは朝/夜で文面が異なり前向き", () => {
    expect(checkinMessage("morning")).not.toBe(checkinMessage("evening"));
    expect(checkinMessage("evening")).toContain("記録するだけで前進");
  });

  it("出戻り歓迎の対象は閾値以上不在の未合格者のみ（前向き文面）", () => {
    const now = Date.UTC(2026, 0, 20);
    const members: MemberActivity[] = [
      { handle: "@a", lastSeenMs: now - 10 * 86_400_000, passed: false }, // 10日不在 → 対象
      { handle: "@b", lastSeenMs: now - 1 * 86_400_000, passed: false }, // 直近 → 対象外
      { handle: "@c", lastSeenMs: now - 30 * 86_400_000, passed: true }, // 合格者 → 対象外
    ];
    const sel = selectReturningMembers(members, now, 7);
    expect(sel).toEqual(["@a"]);
    expect(returningWelcome("@a")).toContain("おかえり");
  });

  it("合格報告→卒業生ロール付与を判定する", () => {
    expect(graduationRole({ handle: "@x", lastSeenMs: 0, passed: true })).toEqual({
      handle: "@x",
      grantRole: "卒業生",
    });
    expect(graduationRole({ handle: "@y", lastSeenMs: 0, passed: false })).toBeNull();
  });
});
