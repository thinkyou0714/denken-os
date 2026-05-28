import { SUBJECTS, type Problem, type Subject } from "@/domain/content/schema";
import type { ProgressStore } from "@/domain/progress/store";
import { dayKey } from "./streak";

/** 7 日以上の間隔を獲得したカードを "Memory Locked" とみなす(長期記憶定着の指標)。 */
const MEMORY_LOCKED_DAYS = 7;
/** 30 日以上の間隔を獲得したカードを "Mastered" とみなす。 */
const MASTERED_DAYS = 30;

export interface Achievements {
  /** scheduled_days >= 7 だが < 30 のカード数。 */
  memoryLocked: number;
  /** scheduled_days >= 30 のカード数(より強い定着)。 */
  mastered: number;
  /** 1 日のうちに 4 科目すべてに触れた日数(インターリーブ実践日)。 */
  interleaverDays: number;
}

export function computeAchievements(
  problems: Problem[],
  store: ProgressStore,
): Achievements {
  let memoryLocked = 0;
  let mastered = 0;
  for (const p of problems) {
    const card = store.getCard(p.id);
    if (!card) continue;
    if (card.scheduled_days >= MASTERED_DAYS) {
      mastered += 1;
    } else if (card.scheduled_days >= MEMORY_LOCKED_DAYS) {
      memoryLocked += 1;
    }
  }

  const subjectOf = new Map<string, Subject>(
    problems.map((p) => [p.id, p.subject]),
  );
  const dayToSubjects = new Map<string, Set<Subject>>();
  for (const log of store.logs()) {
    const subj = subjectOf.get(log.problemId);
    if (!subj) continue;
    const day = dayKey(log.reviewedAt);
    if (!dayToSubjects.has(day)) dayToSubjects.set(day, new Set());
    dayToSubjects.get(day)!.add(subj);
  }
  let interleaverDays = 0;
  for (const set of dayToSubjects.values()) {
    if (set.size >= SUBJECTS.length) interleaverDays += 1;
  }

  return { memoryLocked, mastered, interleaverDays };
}

/** 今日この時点で記録された解答数(今日のミッション 3 問の進捗計算に使う)。 */
export function todayReviewCount(store: ProgressStore, today: Date): number {
  const target = dayKey(today);
  return store
    .logs()
    .filter((l) => dayKey(l.reviewedAt) === target).length;
}
