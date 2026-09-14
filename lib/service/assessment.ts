import { z } from "zod";

export const sourceRecordSchema = z.object({
  title: z.string().min(1),
  url: z.url().optional(),
  year: z.number().int().optional(),
  exam: z.string().min(1),
  question: z.string().optional(),
  retrievedAt: z.iso.date(),
  modified: z.string(),
  license: z.string().min(1),
  effectiveAt: z.iso.date().optional(),
});
export const gradingPolicySchema = z.object({
  unit: z.string().default(""),
  absolute: z.number().nonnegative().default(1e-9),
  relative: z.number().min(0).max(0.05).default(0.005),
  requireUnit: z.boolean().default(false),
  accepted: z.array(z.string()).default([]),
});
export const blankSchema = z.object({
  id: z.string().min(1),
  label: z.string(),
  points: z.number().nonnegative(),
  answer: z.string(),
  choices: z.array(z.string()).optional(),
  grading: gradingPolicySchema.optional(),
});
export const questionGroupSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  statement: z.string(),
  page: z.number().int().positive().optional(),
  choices: z.array(z.string()).default([]),
  blanks: z.array(blankSchema).min(1),
  selectionGroup: z.string().optional(),
  skillIds: z.array(z.string()).default([]),
});
export const paperSchema = z
  .object({
    id: z.string().min(1),
    revision: z.string().min(1),
    title: z.string().min(1),
    exam: z.enum(["denken2_primary", "denken2_secondary", "denken3"]),
    subject: z.string(),
    durationMinutes: z.number().int().positive(),
    source: sourceRecordSchema,
    questionPdf: z.string(),
    answerPdf: z.string(),
    groups: z.array(questionGroupSchema).min(1),
    selections: z.array(z.object({ id: z.string(), count: z.number().int().positive() })).default([]),
    status: z.enum(["draft", "source_verified", "reviewed", "retracted"]),
  })
  .superRefine((paper, ctx) => {
    const ids = paper.groups.flatMap((g) => g.blanks.map((b) => b.id));
    if (new Set(ids).size !== ids.length) ctx.addIssue({ code: "custom", message: "空欄IDが重複しています" });
    for (const group of paper.groups) {
      if (group.selectionGroup && !paper.selections.some((s) => s.id === group.selectionGroup))
        ctx.addIssue({ code: "custom", message: "選択群の定義がありません" });
      for (const blank of group.blanks) {
        const choices = blank.choices ?? group.choices;
        if (choices.length && !choices.includes(blank.answer))
          ctx.addIssue({ code: "custom", message: "正答が解答群にありません" });
      }
    }
  });
export type Paper = z.infer<typeof paperSchema>;
export type GradingPolicy = z.infer<typeof gradingPolicySchema>;
export const CAUSES = [
  "不明",
  "知識",
  "式の選択",
  "前提条件",
  "単位",
  "係数",
  "計算",
  "読み落とし",
  "時間不足",
] as const;
export const attemptSchema = z
  .object({
    id: z.string().min(1).max(100),
    problemId: z.string().min(1),
    revision: z.string().min(1),
    topic: z.string(),
    skill: z.string().default("応用"),
    subject: z.string(),
    family: z.string(),
    answer: z.string().max(10000),
    correct: z.boolean().nullable(),
    score: z.number().min(0).max(1).nullable(),
    hints: z.number().int().min(0).max(100),
    revealed: z.boolean(),
    mode: z.enum(["practice", "review", "holdout", "exam", "validation"]),
    startedAt: z.number().finite(),
    finishedAt: z.number().finite(),
    cause: z.enum(CAUSES).default("不明"),
    graderVersion: z.string().default("service-1"),
  })
  .refine((a) => a.finishedAt >= a.startedAt, "終了時刻が開始時刻より前です");
export type Attempt = z.infer<typeof attemptSchema>;

/** Exact-year grading keeps invalid optional-group selections ungraded. */
export function gradePaper(paper: Paper, answers: Record<string, string>, selected: string[]) {
  const invalidSelections = paper.selections
    .filter((s) => paper.groups.filter((g) => g.selectionGroup === s.id && selected.includes(g.id)).length !== s.count)
    .map((s) => s.id);
  const rows = paper.groups.flatMap((group) => {
    if (group.selectionGroup && !selected.includes(group.id)) return [];
    return group.blanks.map((blank) => ({
      id: blank.id,
      given: answers[blank.id] ?? "",
      answer: blank.answer,
      possible: blank.points,
      earned:
        group.selectionGroup && invalidSelections.includes(group.selectionGroup)
          ? 0
          : answers[blank.id] === blank.answer
            ? blank.points
            : 0,
      invalidSelection: !!group.selectionGroup && invalidSelections.includes(group.selectionGroup),
    }));
  });
  // The denominator follows the examination blueprint, never the number answered.
  let possible = paper.groups
    .filter((g) => !g.selectionGroup)
    .reduce((sum, g) => sum + g.blanks.reduce((n, b) => n + b.points, 0), 0);
  for (const selection of paper.selections) {
    const values = paper.groups
      .filter((g) => g.selectionGroup === selection.id)
      .map((g) => g.blanks.reduce((n, b) => n + b.points, 0));
    const chosen = paper.groups.filter((g) => g.selectionGroup === selection.id && selected.includes(g.id));
    possible +=
      chosen.length === selection.count
        ? chosen.reduce((n, g) => n + g.blanks.reduce((v, b) => v + b.points, 0), 0)
        : (values[0] ?? 0) * selection.count;
  }
  return { rows, earned: rows.reduce((n, r) => n + r.earned, 0), possible, invalidSelections };
}

export function learningMetrics(attempts: Attempt[]) {
  const eligible = attempts.filter((a) => a.mode !== "validation" && a.correct !== null);
  const first = new Map<string, Attempt>();
  for (const a of [...eligible].sort((a, b) => a.finishedAt - b.finishedAt))
    if (!first.has(a.family)) first.set(a.family, a);
  const independent = [...first.values()].filter((a) => a.hints === 0 && !a.revealed);
  const holdout = independent.filter((a) => a.mode === "holdout");
  const rate = (rows: Attempt[]) => (rows.length ? rows.filter((a) => a.correct).length / rows.length : null);
  return {
    count: eligible.length,
    unassistedCount: independent.length,
    unassistedRate: rate(independent),
    holdoutCount: holdout.length,
    holdoutRate: rate(holdout),
    assistedCount: eligible.filter((a) => a.hints > 0 || a.revealed).length,
    minutes: eligible.reduce((n, a) => n + (a.finishedAt - a.startedAt) / 60000, 0),
  };
}

export function planSession(
  minutes: number,
  tasks: { id: string; estimatedMinutes: number; due: boolean; weakness: number }[],
) {
  let remaining = Math.max(0, Math.min(180, minutes));
  const chosen: typeof tasks = [];
  for (const task of [...tasks].sort((a, b) => Number(b.due) - Number(a.due) || b.weakness - a.weakness)) {
    if (task.estimatedMinutes > 0 && task.estimatedMinutes <= remaining) {
      chosen.push(task);
      remaining -= task.estimatedMinutes;
    }
  }
  return { chosen, remaining, backlog: tasks.filter((t) => t.due && !chosen.includes(t)).length };
}
