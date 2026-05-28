import type { ReviewRecord } from "@/domain/progress/store";

const DAY_MS = 86_400_000;

/** ローカルタイムで `YYYY-MM-DD` を返す。日次集計の単一情報源。 */
export function dayKey(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dayKeyNDaysAgo(today: Date, n: number): string {
  const d = new Date(today);
  d.setDate(d.getDate() - n);
  return dayKey(d);
}

export interface StreakResult {
  /** 現在の連続日数(フリーズ消費を考慮した実効値)。 */
  current: number;
  /** 過去最高の自然連続日数(フリーズ非適用)。 */
  longest: number;
  /** 現在の連続を維持するために使用中のフリーズ枚数。 */
  freezesUsed: number;
  /** 今日少なくとも 1 件記録があるか。 */
  activeToday: boolean;
  /** 最後の活動から何日前か(無ければ -1)。 */
  daysSinceLast: number;
}

function longestRun(active: Set<string>): number {
  if (active.size === 0) return 0;
  const sorted = [...active].sort();
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const k of sorted) {
    if (prev === null) {
      run = 1;
    } else {
      const diff = Math.round(
        (new Date(k).getTime() - new Date(prev).getTime()) / DAY_MS,
      );
      run = diff === 1 ? run + 1 : 1;
    }
    if (run > longest) longest = run;
    prev = k;
  }
  return longest;
}

function daysSinceLast(active: Set<string>, today: Date): number {
  for (let i = 0; i < 36_500; i++) {
    if (active.has(dayKeyNDaysAgo(today, i))) return i;
  }
  return -1;
}

/**
 * 連続学習日数を計算する。
 *
 * 設計:
 * - "活動日" は logs に該当日のレビューが 1 件でもあるかで決まる(正誤問わず)。
 * - 今日が未活動でも昨日まで連続していれば連続は維持(grace)。
 * - 連続中の途中ギャップ日はフリーズ枚数の範囲で自動消費して埋める。
 * - longest はフリーズを適用しない素の最長連続日数。
 */
export function computeStreak(
  logs: ReviewRecord[],
  today: Date,
  freezesAvailable: number,
): StreakResult {
  const active = new Set(logs.map((l) => dayKey(l.reviewedAt)));
  const activeToday = active.has(dayKey(today));

  let current = 0;
  let freezesUsed = 0;
  let cursor = 0;
  let firstActiveFound = false;

  // 安全境界つきウォーク(無限ループ防御。実用上の上限としては超長期学習者を想定して 100 年)。
  const MAX_LOOKBACK = 36_500;
  while (cursor < MAX_LOOKBACK) {
    const key = dayKeyNDaysAgo(today, cursor);
    if (active.has(key)) {
      current += 1;
      firstActiveFound = true;
      cursor += 1;
      continue;
    }
    // 未活動日
    if (cursor === 0 && !firstActiveFound) {
      // 今日が未活動でも grace で破断扱いにしない
      cursor += 1;
      continue;
    }
    if (freezesUsed < freezesAvailable) {
      freezesUsed += 1;
      cursor += 1;
      continue;
    }
    break;
  }

  if (!firstActiveFound) {
    return {
      current: 0,
      longest: longestRun(active),
      freezesUsed: 0,
      activeToday,
      daysSinceLast: daysSinceLast(active, today),
    };
  }

  return {
    current,
    longest: longestRun(active),
    freezesUsed,
    activeToday,
    daysSinceLast: daysSinceLast(active, today),
  };
}

/** 今週(月曜起算) / 先週の活動日数を返す。週次レポート用。 */
export function weeklyActiveDays(
  logs: ReviewRecord[],
  today: Date,
): { thisWeek: number; lastWeek: number } {
  const active = new Set(logs.map((l) => dayKey(l.reviewedAt)));
  // 月曜起算: getDay() は日曜=0
  const day = today.getDay();
  const daysFromMonday = (day + 6) % 7;
  const thisMonday = new Date(today);
  thisMonday.setDate(today.getDate() - daysFromMonday);
  thisMonday.setHours(0, 0, 0, 0);

  let thisWeek = 0;
  let lastWeek = 0;
  for (let i = 0; i < 7; i++) {
    const tw = new Date(thisMonday);
    tw.setDate(thisMonday.getDate() + i);
    if (active.has(dayKey(tw))) thisWeek += 1;
    const lw = new Date(thisMonday);
    lw.setDate(thisMonday.getDate() + i - 7);
    if (active.has(dayKey(lw))) lastWeek += 1;
  }
  return { thisWeek, lastWeek };
}
