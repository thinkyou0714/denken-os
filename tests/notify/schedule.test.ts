import { describe, expect, it } from "vitest";
import { DEFAULT_PREFS, type NotificationPrefs, planNotifications } from "../../lib/notify/schedule.js";

describe("通知計画（12）", () => {
  const now = new Date("2026-06-01T12:00:00");

  it("オフにした種別は計画に含まれない（オプトアウト即時反映）", () => {
    const prefs: NotificationPrefs = {
      ...DEFAULT_PREFS,
      enabled: { ...DEFAULT_PREFS.enabled, study_reminder: false },
    };
    const plan = planNotifications({ prefs, now, rng: () => 0.5 });
    expect(plan.find((p) => p.kind === "study_reminder")).toBeUndefined();
  });

  it("学習リマインドは設定時刻にジッターが入る", () => {
    const plan = planNotifications({ prefs: DEFAULT_PREFS, now, rng: () => 1 }); // +jitter最大
    const r = plan.find((p) => p.kind === "study_reminder")!;
    const base = new Date(now);
    base.setHours(20, 0, 0, 0);
    expect(r.atMs).toBe(base.getTime() + 15 * 60_000);
  });

  it("ストリークは途切れそうなとき(未学習)だけ・前向き文面", () => {
    const at = planNotifications({ prefs: DEFAULT_PREFS, now, studiedToday: false, streakDays: 5, rng: () => 0.5 });
    expect(at.find((p) => p.kind === "streak_at_risk")?.message).toContain("休んでもOK");
    const none = planNotifications({ prefs: DEFAULT_PREFS, now, studiedToday: true, streakDays: 5, rng: () => 0.5 });
    expect(none.find((p) => p.kind === "streak_at_risk")).toBeUndefined();
  });

  it("試験カウントダウンは節目の日数でのみ出る", () => {
    const exam = new Date(now.getTime() + 7 * 86_400_000);
    const plan = planNotifications({ prefs: DEFAULT_PREFS, now, examDate: exam, rng: () => 0.5 });
    expect(plan.find((p) => p.kind === "exam_countdown")?.message).toContain("7日");

    const exam2 = new Date(now.getTime() + 8 * 86_400_000); // 節目でない
    const plan2 = planNotifications({ prefs: DEFAULT_PREFS, now, examDate: exam2, rng: () => 0.5 });
    expect(plan2.find((p) => p.kind === "exam_countdown")).toBeUndefined();
  });
});
