import { SUBJECTS, type Problem, type Subject } from "@/domain/content/schema";
import type { ReviewRecord } from "@/domain/progress/store";

/** 1 回の正答で得る XP。難易度に応じて 10〜18。誤答は 0。 */
export function xpForReview(problem: Problem, correct: boolean): number {
  if (!correct) return 0;
  return 10 + 2 * (problem.difficulty - 1);
}

const LEVEL_DIVISOR = 30;
const SUBJECT_LEVEL_DIVISOR = 10;

/** Lv n → 必要 XP = n^2 * 30。素直に体感的に伸びる平方則。 */
export function levelFromXP(xp: number): number {
  return Math.floor(Math.sqrt(Math.max(0, xp) / LEVEL_DIVISOR));
}

export function levelFromSubjectXP(xp: number): number {
  return Math.floor(Math.sqrt(Math.max(0, xp) / SUBJECT_LEVEL_DIVISOR));
}

export function xpToNextLevel(currentXP: number): {
  xpInLevel: number;
  xpForLevel: number;
} {
  const lv = levelFromXP(currentXP);
  const xpAtThisLevel = lv * lv * LEVEL_DIVISOR;
  const xpAtNextLevel = (lv + 1) * (lv + 1) * LEVEL_DIVISOR;
  return {
    xpInLevel: currentXP - xpAtThisLevel,
    xpForLevel: xpAtNextLevel - xpAtThisLevel,
  };
}

const RANK_THRESHOLDS: ReadonlyArray<readonly [number, string]> = [
  [0, "3種学習者"],
  [300, "3種挑戦者"],
  [1000, "3種合格圏"],
  [3000, "2種挑戦者"],
  [8000, "1種研究者"],
];

export function rankFromXP(xp: number): string {
  let rank = RANK_THRESHOLDS[0][1];
  for (const [threshold, name] of RANK_THRESHOLDS) {
    if (xp >= threshold) rank = name;
  }
  return rank;
}

/** 3種合格圏 XP (=3000) に対する達成率(0〜100)。学習動機の主要指標。 */
const PASS_ZONE_FULL_XP = 3000;
export function passZonePercent(xp: number): number {
  return Math.min(100, Math.round((xp / PASS_ZONE_FULL_XP) * 100));
}

export interface XPSummary {
  total: number;
  perSubject: Record<Subject, number>;
  level: number;
  rank: string;
  passZonePercent: number;
}

export function xpSummary(
  problems: Problem[],
  logs: ReviewRecord[],
): XPSummary {
  const problemMap = new Map(problems.map((p) => [p.id, p]));
  const perSubject = SUBJECTS.reduce(
    (acc, s) => {
      acc[s] = 0;
      return acc;
    },
    {} as Record<Subject, number>,
  );
  let total = 0;
  for (const log of logs) {
    const p = problemMap.get(log.problemId);
    if (!p) continue;
    const gained = xpForReview(p, log.correct);
    perSubject[p.subject] += gained;
    total += gained;
  }
  return {
    total,
    perSubject,
    level: levelFromXP(total),
    rank: rankFromXP(total),
    passZonePercent: passZonePercent(total),
  };
}
