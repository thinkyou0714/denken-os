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
  const stats = SUBJECTS.map<SubjectStat>((subject) => {
    const subjectProblems = problems.filter((p) => p.subject === subject);
    const total = subjectProblems.length;

    let seen = 0;
    let dueCount = 0;
    let rSum = 0;

    for (const p of subjectProblems) {
      const card = store.getCard(p.id);
      if (card) {
        seen += 1;
        rSum += retrievability(card, now);
      }
      if (isDue(card, now)) dueCount += 1;
    }

    const logs = store.logs().filter((l) => {
      const sp = subjectProblems.find((p) => p.id === l.problemId);
      return sp !== undefined;
    });
    const reviews = logs.length;
    const correct = logs.filter((l) => l.correct).length;
    const accuracy = reviews > 0 ? correct / reviews : 0;
    const avgRetrievability = seen > 0 ? rSum / seen : 0;
    const coverage = total > 0 ? seen / total : 0;

    return {
      subject,
      total,
      seen,
      dueCount,
      reviews,
      correct,
      accuracy,
      avgRetrievability,
      mastery: masteryScore(accuracy, avgRetrievability, coverage),
    };
  });

  const started = stats.filter((s) => s.reviews > 0);
  const weakest =
    started.length > 0
      ? started.reduce((a, b) => (b.mastery < a.mastery ? b : a)).subject
      : null;

  return {
    subjects: stats,
    weakest,
    totalDue: stats.reduce((sum, s) => sum + s.dueCount, 0),
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
