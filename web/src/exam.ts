/**
 * exam.ts — 模試（時間制限・本番再現）の出題セット構築と採点（純ロジック）。
 * 本番の緊張感・時間配分・合格ライン(60%)を体験させ、弱点を炙り出す。
 */
import type { Problem, Subject } from "../../lib/engine/schema.js";

export interface ExamOptions {
  count: number;
  /** 対象科目（未指定なら全科目）。 */
  subjects?: Subject[];
  rng?: () => number;
}

export interface ExamScore {
  total: number;
  correct: number;
  scorePct: number; // 0..100（整数）
  passed: boolean; // 合格ライン60%以上
}

/** 合格ライン（電験は各科目おおむね60%）。 */
export const PASS_THRESHOLD = 60;

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/**
 * 模試の出題セットを構築する。対象科目から可能な限り均等に選び、count 件に収める。
 */
export function buildMockExam(problems: Problem[], opts: ExamOptions): Problem[] {
  const rng = opts.rng ?? Math.random;
  const pool = opts.subjects?.length ? problems.filter((p) => opts.subjects!.includes(p.subject)) : [...problems];
  if (pool.length === 0) return [];

  // 科目ごとに分け、ラウンドロビンで均等に取り出す（偏り防止）。
  const groups = new Map<Subject, Problem[]>();
  for (const p of pool) {
    const g = groups.get(p.subject) ?? [];
    g.push(p);
    groups.set(p.subject, g);
  }
  const shuffledGroups = [...groups.values()].map((g) => shuffle(g, rng));
  const out: Problem[] = [];
  let added = true;
  while (out.length < opts.count && added) {
    added = false;
    for (const g of shuffledGroups) {
      if (out.length >= opts.count) break;
      const next = g.shift();
      if (next) {
        out.push(next);
        added = true;
      }
    }
  }
  return out;
}

/** 解答の正誤配列から採点する。 */
export function scoreExam(results: boolean[]): ExamScore {
  const total = results.length;
  const correct = results.filter(Boolean).length;
  const scorePct = total > 0 ? Math.round((correct / total) * 100) : 0;
  return { total, correct, scorePct, passed: scorePct >= PASS_THRESHOLD };
}

export interface SubjectScore extends ExamScore {
  subject: Subject;
}

/**
 * 科目別に採点する。電験一次は科目ごとに合否（各60%）が判定されるため、
 * 出題と同じ並びの results を科目で束ねて各科目のスコアを返す。
 */
export function scoreExamBySubject(set: Problem[], results: boolean[]): SubjectScore[] {
  const bySub = new Map<Subject, boolean[]>();
  set.forEach((p, i) => {
    const arr = bySub.get(p.subject) ?? [];
    arr.push(results[i] ?? false);
    bySub.set(p.subject, arr);
  });
  return [...bySub.entries()].map(([subject, rs]) => ({ subject, ...scoreExam(rs) }));
}

/** 一次本番の合格判定: 受験した全科目が合格ライン(60%)以上であること。 */
export function isPrimaryPass(subjectScores: SubjectScore[]): boolean {
  return subjectScores.length > 0 && subjectScores.every((s) => s.passed);
}
