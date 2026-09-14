import type { Database } from "../lib/service/runtime-types.js";

export interface RecordRow {
  owner: string;
  kind: string;
  id: string;
  body: string;
  revision: number;
  updated_at: number;
  deleted: number;
}
export async function readRecords(db: Database, owner: string, kind: string) {
  const rows = await db
    .prepare("SELECT * FROM records WHERE owner=? AND kind=? AND deleted=0 ORDER BY updated_at DESC LIMIT 2000")
    .bind(owner, kind)
    .all<RecordRow>();
  return rows.results.map((row) => ({ ...row, body: JSON.parse(row.body) as unknown }));
}
export async function writeRecord(
  db: Database,
  owner: string,
  kind: string,
  id: string,
  body: unknown,
  expected: number,
) {
  const statement =
    expected === 0
      ? db
          .prepare(
            "INSERT INTO records(owner,kind,id,body,revision,updated_at,deleted) VALUES(?,?,?,?,1,?,0) ON CONFLICT(owner,kind,id) DO NOTHING",
          )
          .bind(owner, kind, id, JSON.stringify(body), Date.now())
      : db
          .prepare(
            "UPDATE records SET body=?,revision=revision+1,updated_at=?,deleted=0 WHERE owner=? AND kind=? AND id=? AND revision=? AND deleted=0",
          )
          .bind(JSON.stringify(body), Date.now(), owner, kind, id, expected);
  const result = await statement.run();
  return result.meta.changes === 1;
}
export async function logAudit(db: Database, actor: string, action: string, target: string, detail: unknown) {
  await db
    .prepare("INSERT INTO audit(id,actor,action,target,detail,created_at) VALUES(?,?,?,?,?,?)")
    .bind(crypto.randomUUID(), actor, action, target, JSON.stringify(detail), Date.now())
    .run();
}
export async function digest(value: unknown) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const buffer = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(buffer)].map((v) => v.toString(16).padStart(2, "0")).join("");
}
