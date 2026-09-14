import { z } from "zod";
import { attemptSchema } from "../lib/service/assessment.js";
import type { Bucket, Database } from "../lib/service/runtime-types.js";
import { writeRecord } from "./db.js";

const safeKinds = new Set([
  "profile",
  "plan",
  "note",
  "cause",
  "experiment",
  "legacy",
  "interview",
  "skills",
  "feedback",
  "cost",
  "voice",
  "holdout",
  "draft",
]);
const rowSchema = z.object({
  id: z.string().min(1).max(120),
  kind: z.string(),
  body: z.unknown(),
  deleted: z.number().int().min(0).max(1).default(0),
});
const backupSchema = z.object({
  app: z.literal("denken-os-service"),
  version: z.literal(1),
  records: z.array(rowSchema).max(10000),
  attempts: z.array(attemptSchema).max(20000),
});
export function validLegacy(value: unknown): boolean {
  const result = z.object({ data: z.record(z.string(), z.string()) }).safeParse(value);
  return (
    result.success &&
    Object.keys(result.data.data).every((k) => k.startsWith("denken:") && !/apiKey|secret|token|license/i.test(k))
  );
}
export async function importRecords(db: Database, owner: string, raw: unknown) {
  const backup = backupSchema.parse(raw);
  let imported = 0;
  const conflicts: string[] = [],
    skipped: string[] = [];
  // Validate all accepted records before making the first write.
  for (const row of backup.records)
    if (row.kind === "legacy" && !validLegacy(row.body)) throw new Error("秘密情報を含むバックアップは取り込めません");
  for (const row of backup.records) {
    if (!safeKinds.has(row.kind) || row.deleted) {
      skipped.push(`${row.kind}/${row.id}`);
      continue;
    }
    const existing = await db
      .prepare("SELECT body FROM records WHERE owner=? AND kind=? AND id=?")
      .bind(owner, row.kind, row.id)
      .first<{ body: string }>();
    if (existing) {
      if (existing.body !== JSON.stringify(row.body)) conflicts.push(`${row.kind}/${row.id}`);
      continue;
    }
    if (await writeRecord(db, owner, row.kind, row.id, row.body, 0)) imported++;
    else conflicts.push(`${row.kind}/${row.id}`);
  }
  for (const original of backup.attempts) {
    const existing = await db
      .prepare("SELECT body FROM attempts WHERE owner=? AND id=?")
      .bind(owner, original.id)
      .first<{ body: string }>();
    // Imported events retain their history but are excluded from independently measured outcomes.
    const attempt = {
      ...original,
      mode: "validation",
      graderVersion: `imported:${original.graderVersion}`,
      correct: original.correct,
    };
    if (existing) {
      const previous = JSON.parse(existing.body);
      if (
        previous.problemId !== original.problemId ||
        previous.revision !== original.revision ||
        previous.answer !== original.answer
      )
        conflicts.push(`attempt/${original.id}`);
      continue;
    }
    const saved = await db
      .prepare(
        "INSERT INTO attempts(owner,id,problem_id,revision,family,mode,body,created_at) VALUES(?,?,?,?,?,'validation',?,?) ON CONFLICT(owner,id) DO NOTHING",
      )
      .bind(
        owner,
        attempt.id,
        attempt.problemId,
        attempt.revision,
        attempt.family,
        JSON.stringify(attempt),
        attempt.finishedAt,
      )
      .run();
    if (saved.meta.changes) imported++;
  }
  return {
    imported,
    conflicts,
    skipped,
    note: "取り込んだ答案は履歴として保持し、新環境の自力成績には加算しません。試験セッション、運営権限、監修記録、画像本体は移しません。",
  };
}
export async function purgeExpiredAssets(db: Database, bucket: Bucket | undefined) {
  if (!bucket) return { deleted: 0 };
  const rows = await db
    .prepare("SELECT id,object_key FROM assets WHERE expires_at<? LIMIT 1000")
    .bind(Date.now())
    .all<{ id: string; object_key: string }>();
  for (const row of rows.results) {
    await bucket.delete(row.object_key);
    await db.prepare("DELETE FROM assets WHERE id=? AND expires_at<?").bind(row.id, Date.now()).run();
  }
  return { deleted: rows.results.length };
}
