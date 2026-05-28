import { SUBJECTS, type Problem, type Subject } from "@/domain/content/schema";
import type { ProgressStore } from "@/domain/progress/store";
import { isDue, retrievability } from "./scheduler";

export interface SubjectStat {
  subject: Subject;
  total: number; // 科目内の総問題数
  seen: number; // 一度でも解いた問題数
  dueCount: number; // 現在復習期限が来ている問題数
  reviews: number; // 累計解答回数
  correct: number; // 累計正答回数
  accuracy: number; // 正答率 0〜1(解答が無ければ 0)
  avgRetrievability: number; // 学習済みカードの平均保持率 0〜1
  mastery: number; // 0〜100 の習熟度スコア
}

export interface Diagnosis {
  subjects: SubjectStat[];
  weakest: Subject | null; // 学習着手済みで最も習熟度が低い科目
  totalDue: number;
}

interface Accumulator {
  total: number;
  seen: number;
  dueCount: number;
  reviews: number;
  correct: number;
  rSum: number;
}

/**
 * 習熟度スコア。正答率・記憶保持率・網羅率を重み付けした合成指標。
 * 未着手科目は 0 に近づき、復習が定着するほど 100 に近づく。
 */
function masteryScore(accuracy: number, avgR: number, coverage: number): number {
  return Math.round(100 * (0.5 * accuracy + 0.3 * avgR + 0.2 * coverage));
}

export function diagnose(
  problems: Problem[],
  store: ProgressStore,
  now: Date = new Date(),
): Diagnosis {
  const acc = new Map<Subject, Accumulator>(
    SUBJECTS.map((s) => [
      s,
      { total: 0, seen: 0, dueCount: 0, reviews: 0, correct: 0, rSum: 0 },
    ]),
  );
  const subjectOf = new Map<string, Subject>();

  // 問題を 1 度だけ走査(カード状態の集計)。
  for (const p of problems) {
    subjectOf.set(p.id, p.subject);
    const a = acc.get(p.subject)!;
    a.total += 1;
    const card = store.getCard(p.id);
    if (card) {
      a.seen += 1;
      a.rSum += retrievability(card, now);
    }
    if (isDue(card, now)) a.dueCount += 1;
  }

  // ログを 1 度だけ走査(正答率の集計)。
  for (const log of store.logs()) {
    const subject = subjectOf.get(log.problemId);
    if (!subject) continue; // 既に削除された問題のログは無視
    const a = acc.get(subject)!;
    a.reviews += 1;
    if (log.correct) a.correct += 1;
  }

  const subjects = SUBJECTS.map<SubjectStat>((subject) => {
    const a = acc.get(subject)!;
    const accuracy = a.reviews > 0 ? a.correct / a.reviews : 0;
    const avgRetrievability = a.seen > 0 ? a.rSum / a.seen : 0;
    const coverage = a.total > 0 ? a.seen / a.total : 0;
    return {
      subject,
      total: a.total,
      seen: a.seen,
      dueCount: a.dueCount,
      reviews: a.reviews,
      correct: a.correct,
      accuracy,
      avgRetrievability,
      mastery: masteryScore(accuracy, avgRetrievability, coverage),
    };
  });

  const started = subjects.filter((s) => s.reviews > 0);
  const weakest =
    started.length > 0
      ? started.reduce((a, b) => (b.mastery < a.mastery ? b : a)).subject
      : null;

  return {
    subjects,
    weakest,
    totalDue: subjects.reduce((sum, s) => sum + s.dueCount, 0),
  };
}

/**
 * 復習キューを構築する。
 * 優先順位: (1) 期限切れの復習問題を期限が古い順、(2) 未学習問題。
 */
export function buildQueue(
  problems: Problem[],
  store: ProgressStore,
  now: Date = new Date(),
  limit = 20,
): Problem[] {
  const candidates = problems
    .map((problem) => {
      const card = store.getCard(problem.id);
      const isNew = card === null;
      const due = card ? new Date(card.due).getTime() : now.getTime();
      return { problem, isNew, due };
    })
    .filter((c) => c.due <= now.getTime());

  candidates.sort((a, b) => {
    if (a.isNew !== b.isNew) return a.isNew ? 1 : -1; // 復習を新規より優先
    return a.due - b.due; // 期限が古い順
  });

  return candidates.slice(0, limit).map((c) => c.problem);
}
