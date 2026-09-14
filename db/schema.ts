import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const members = sqliteTable(
  "members",
  {
    id: text("id").primaryKey(),
    role: text("role").notNull().default("student"),
    createdAt: integer("created_at").notNull(),
    status: text("status").notNull().default("active"),
  },
  (t) => [uniqueIndex("one_owner").on(t.role).where(sql`${t.role} = 'owner'`)],
);

export const records = sqliteTable(
  "records",
  {
    owner: text("owner").notNull(),
    kind: text("kind").notNull(),
    id: text("id").notNull(),
    body: text("body").notNull(),
    revision: integer("revision").notNull().default(1),
    updatedAt: integer("updated_at").notNull(),
    deleted: integer("deleted").notNull().default(0),
  },
  (t) => [
    uniqueIndex("records_identity").on(t.owner, t.kind, t.id),
    index("records_owner_kind_updated").on(t.owner, t.kind, t.updatedAt),
  ],
);

export const attempts = sqliteTable(
  "attempts",
  {
    owner: text("owner").notNull(),
    id: text("id").notNull(),
    problemId: text("problem_id").notNull(),
    revision: text("revision").notNull(),
    family: text("family").notNull(),
    mode: text("mode").notNull(),
    body: text("body").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [uniqueIndex("attempts_identity").on(t.owner, t.id), index("attempts_owner_created").on(t.owner, t.createdAt)],
);

export const reviews = sqliteTable(
  "reviews",
  {
    id: text("id").primaryKey(),
    target: text("target").notNull(),
    fingerprint: text("fingerprint").notNull(),
    decision: text("decision").notNull(),
    reviewer: text("reviewer").notNull(),
    reason: text("reason").notNull(),
    cases: text("cases").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [index("reviews_target_time").on(t.target, t.createdAt)],
);

export const assets = sqliteTable(
  "assets",
  {
    id: text("id").primaryKey(),
    owner: text("owner").notNull(),
    objectKey: text("object_key").notNull(),
    mime: text("mime").notNull(),
    size: integer("size").notNull(),
    createdAt: integer("created_at").notNull(),
    expiresAt: integer("expires_at").notNull(),
  },
  (t) => [index("assets_owner_expiry").on(t.owner, t.expiresAt)],
);

export const usage = sqliteTable(
  "usage",
  {
    owner: text("owner").notNull(),
    day: text("day").notNull(),
    kind: text("kind").notNull(),
    requests: integer("requests").notNull().default(0),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    inFlight: integer("in_flight").notNull().default(0),
    leaseUntil: integer("lease_until").notNull().default(0),
  },
  (t) => [uniqueIndex("usage_identity").on(t.owner, t.day, t.kind)],
);

export const audit = sqliteTable(
  "audit",
  {
    id: text("id").primaryKey(),
    actor: text("actor").notNull(),
    action: text("action").notNull(),
    target: text("target").notNull(),
    detail: text("detail").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [index("audit_created").on(t.createdAt)],
);
