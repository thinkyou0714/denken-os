/**
 * schedule.ts — リマインド/通知の純ロジック（12-reminder-notifications）。
 * 通知過多=離脱の根本原因 → ユーザーが頻度を制御でき、オプトアウトは即反映、
 * 配信時刻にゆらぎ、文面は前向き（罪悪感で追い込まない）。
 * 実配信(Web Push/Discord)はこの純関数の出力を送るアダプタが担う。
 */

export type NotificationKind = "study_reminder" | "streak_at_risk" | "exam_countdown" | "evening_answer";

export interface NotificationPrefs {
  enabled: Record<NotificationKind, boolean>;
  /** 学習リマインドの基準時刻（"HH:MM", ローカル）。 */
  reminderTime: string;
  /** 配信時刻のゆらぎ（分）。 */
  jitterMinutes: number;
}

export interface PlannedNotification {
  kind: NotificationKind;
  atMs: number;
  message: string;
}

export const DEFAULT_PREFS: NotificationPrefs = {
  enabled: {
    study_reminder: true,
    streak_at_risk: true,
    exam_countdown: true,
    evening_answer: true,
  },
  reminderTime: "20:00",
  jitterMinutes: 15,
};

/** "HH:MM" を解析する。不正・範囲外は安全な既定(20:00)へクランプ（NaN を時刻に渡さない）。 */
function parseHHMM(s: string): { h: number; m: number } {
  const [hs, ms] = s.split(":");
  const h = Number(hs);
  const m = Number(ms);
  return {
    h: Number.isInteger(h) && h >= 0 && h <= 23 ? h : 20,
    m: Number.isInteger(m) && m >= 0 && m <= 59 ? m : 0,
  };
}

function jitter(baseMs: number, spreadMinutes: number, rng: () => number): number {
  const delta = Math.round((rng() * 2 - 1) * spreadMinutes);
  return baseMs + delta * 60_000;
}

export interface PlanContext {
  prefs: NotificationPrefs;
  now: Date;
  /** 連続学習日数。途切れそうなとき(=今日まだ未学習)だけ streak ナッジ。 */
  streakDays?: number;
  studiedToday?: boolean;
  /** 試験日（カウントダウン用）。 */
  examDate?: Date;
  rng?: () => number;
}

/**
 * 今日送るべき通知を、ユーザー設定とオプトアウトを尊重して計画する。
 * オフの種別は一切含めない（オプトアウト即時反映）。
 */
export function planNotifications(ctx: PlanContext): PlannedNotification[] {
  const { prefs, now } = ctx;
  const rng = ctx.rng ?? Math.random;
  const out: PlannedNotification[] = [];

  // 学習リマインド（設定時刻 ± ジッター）
  if (prefs.enabled.study_reminder) {
    const { h, m } = parseHHMM(prefs.reminderTime);
    const base = new Date(now);
    base.setHours(h, m, 0, 0);
    out.push({
      kind: "study_reminder",
      atMs: jitter(base.getTime(), prefs.jitterMinutes, rng),
      message: "今日の一問、まだなら今がチャンス。1問だけでもOK。",
    });
  }

  // ストリーク維持ナッジ（途切れそうなときだけ・控えめに）
  if (prefs.enabled.streak_at_risk && ctx.studiedToday === false && (ctx.streakDays ?? 0) >= 2) {
    out.push({
      kind: "streak_at_risk",
      atMs: now.getTime(),
      message: `${ctx.streakDays}日継続中。今日1問で記録キープ（無理なら休んでもOK）。`,
    });
  }

  // 試験カウントダウン（節目で）
  if (prefs.enabled.exam_countdown && ctx.examDate) {
    const days = Math.ceil((ctx.examDate.getTime() - now.getTime()) / 86_400_000);
    if (days > 0 && [100, 60, 30, 14, 7, 3, 1].includes(days)) {
      out.push({ kind: "exam_countdown", atMs: now.getTime(), message: `試験まであと${days}日。コツコツいこう。` });
    }
  }

  return out;
}
