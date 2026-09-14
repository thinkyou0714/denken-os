import { z } from "zod";
import type { Database } from "../lib/service/runtime-types.js";
import { digest, logAudit, writeRecord } from "./db.js";

const criterion = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  max: z.number().positive().max(100),
  reason: z.string().min(1),
});
const rubricSchema = z
  .object({
    problemId: z.string().min(1),
    problemRevision: z.string().min(1),
    title: z.string().min(1),
    criteria: z.array(criterion).min(1).max(30),
    humanConfirmed: z.literal(true),
  })
  .refine((r) => new Set(r.criteria.map((c) => c.id)).size === r.criteria.length, "観点IDが重複しています");
export async function saveRubric(db: Database, reviewer: string, raw: unknown) {
  const input = rubricSchema.parse(raw),
    id = await digest(input);
  await writeRecord(db, "catalog", "rubric", id, { ...input, reviewer, reviewedAt: Date.now() }, 0);
  await logAudit(db, reviewer, "rubric:create", id, { problemId: input.problemId });
  return { id };
}
export async function respondSupport(db: Database, reviewer: string, raw: unknown) {
  const input = z
    .object({
      owner: z.string(),
      id: z.string(),
      expectedRevision: z.number().int().positive(),
      reply: z.string().min(1).max(10000),
      rubricId: z.string().optional(),
      scores: z.record(z.string(), z.number().nonnegative()).default({}),
    })
    .parse(raw);
  const existing = await db
    .prepare("SELECT body FROM records WHERE owner=? AND kind='support' AND id=? AND deleted=0")
    .bind(input.owner, input.id)
    .first<{ body: string }>();
  if (!existing) throw new Error("確認依頼がありません");
  const previous = JSON.parse(existing.body);
  if (previous.shareWithReviewer !== true) throw new Error("監修者への共有が選択されていません");
  let result: { earned: number; possible: number } | null = null;
  if (input.rubricId) {
    const row = await db
      .prepare("SELECT body FROM records WHERE owner='catalog' AND kind='rubric' AND id=? AND deleted=0")
      .bind(input.rubricId)
      .first<{ body: string }>();
    if (!row) throw new Error("採点観点がありません");
    const rubric = rubricSchema.parse(JSON.parse(row.body));
    if (rubric.problemId !== previous.problemId || rubric.problemRevision !== previous.revision)
      throw new Error("問題版と採点観点が一致しません");
    if (
      Object.keys(input.scores).length !== rubric.criteria.length ||
      rubric.criteria.some((c) => input.scores[c.id] === undefined || (input.scores[c.id] ?? 0) > c.max)
    )
      throw new Error("各観点の範囲内で得点を入力してください");
    result = {
      earned: Object.values(input.scores).reduce((a, b) => a + b, 0),
      possible: rubric.criteria.reduce((n, c) => n + c.max, 0),
    };
  }
  const saved = await writeRecord(
    db,
    input.owner,
    "support",
    input.id,
    {
      ...previous,
      reply: input.reply,
      rubricId: input.rubricId,
      scores: input.scores,
      result,
      reviewer,
      reviewedAt: Date.now(),
      status: "answered",
    },
    input.expectedRevision,
  );
  if (!saved) return { conflict: true };
  await logAudit(db, reviewer, "support:respond", input.id, { rubricId: input.rubricId });
  return { saved: true };
}
export async function calibration(db: Database) {
  const rows = await db
    .prepare(
      "SELECT problem_id,owner,body,created_at FROM attempts WHERE mode!='validation' ORDER BY created_at,id LIMIT 50000",
    )
    .all<{ problem_id: string; owner: string; body: string }>();
  const seen = new Set<string>(),
    groups = new Map<string, { learners: number; correct: number }>();
  for (const row of rows.results) {
    const key = `${row.owner}:${row.problem_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const a = JSON.parse(row.body);
    if (a.hints || a.revealed || a.correct === null) continue;
    const value = groups.get(row.problem_id) ?? { learners: 0, correct: 0 };
    value.learners++;
    value.correct += Number(a.correct);
    groups.set(row.problem_id, value);
  }
  return [...groups].map(([problemId, v]) => ({
    problemId,
    learners: v.learners,
    rate: v.learners >= 30 ? v.correct / v.learners : null,
  }));
}
