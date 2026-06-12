/**
 * supabase-store.ts — store インターフェースの Supabase 実装（05 / supabase/migrations の DDL に対応）。
 *
 * 既定はインメモリ/ファイル実装。本実装は認証取得後（human-tasks.md）に
 *   const stores = createSupabaseStores(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!)
 * で差し込む。行⇔ドメインのマッピングは純関数として切り出し、テスト可能にしている
 * （実 I/O は薄いラッパ）。
 *
 * zod 検証: rowToProblem / rowToReviewState / rowToAnswerLog は zod スキーマで検証し、
 * パース失敗時は「どのテーブルのどの id か」を含むエラーを投げる（I-022）。
 * 正常系データは全て通過するため、既存テストは無変更でグリーンになる。
 *
 * エラーラッパ: fail(op, error) で操作名付きのエラーに統一する（I-023）。
 * URL/key の空チェック: createSupabaseStores で早期失敗（I-024）。
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Problem } from "../engine/schema.js";
import { problemSchema } from "../engine/schema.js";
import type { AnswerLog } from "../scheduler/diagnosis.js";
import type { ReviewState } from "../scheduler/types.js";
import type { AnswerLogStore, ProblemStore, ReviewStateStore } from "./index.js";

// ── エラーラッパ（I-023）────────────────────────────────────────────────────

/**
 * Supabase 操作の失敗を統一フォーマットで投げる内部ヘルパー。
 * 例: `fail("problems.upsert", error)` → `Error: problems.upsert failed: <message>`
 */
function fail(op: string, error: { message: string }): never {
  throw new Error(`${op} failed: ${error.message}`);
}

// ── 行 ⇔ ドメイン マッピング（純関数・テスト対象）──────────────────────────

export interface ProblemRow {
  id: string;
  exam: string | null;
  subject: string;
  topic: string;
  format: string;
  difficulty: number;
  statement: string;
  choices: string[] | null;
  answer: string;
  solution: string[];
  validation: Problem["validation"];
  source: Problem["source"];
  stats: Problem["stats"] | null;
  status: string;
}

export function problemToRow(p: Problem): ProblemRow {
  return {
    id: p.id,
    exam: p.exam ?? null,
    subject: p.subject,
    topic: p.topic,
    format: p.format ?? "multiple_choice",
    difficulty: p.difficulty,
    statement: p.statement,
    choices: p.choices ?? null,
    answer: p.answer,
    solution: p.solution,
    validation: p.validation,
    source: p.source,
    stats: p.stats ?? null,
    status: p.status ?? "draft",
  };
}

/**
 * DB 行を Problem ドメインオブジェクトへ変換する。
 * zod で検証し、失敗時は `"problems table, id=<id>"` を含むエラーを投げる（I-022）。
 */
export function rowToProblem(r: ProblemRow): Problem {
  const raw = {
    id: r.id,
    exam: r.exam ?? undefined,
    subject: r.subject,
    topic: r.topic,
    format: r.format,
    difficulty: r.difficulty,
    statement: r.statement,
    choices: r.choices ?? undefined,
    answer: r.answer,
    solution: r.solution,
    validation: r.validation,
    source: r.source,
    stats: r.stats ?? undefined,
    status: r.status,
  };
  const result = problemSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`problems table, id=${r.id}: ${issues}`);
  }
  return result.data;
}

export interface ReviewStateRow {
  user_id: string;
  topic: string;
  reps: number;
  lapses: number;
  interval_days: number;
  ease: number;
  due_at: string; // ISO
  last_review_at: string | null;
}

/** zod スキーマ: review_states テーブル行の最小検証。 */
const reviewStateRowSchema = z.object({
  reps: z.number().int().min(0),
  lapses: z.number().int().min(0),
  interval_days: z.number().min(0),
  ease: z.number().min(0),
  due_at: z.string().datetime({ offset: true }),
  last_review_at: z.string().datetime({ offset: true }).nullable(),
});

export function reviewStateToRow(userId: string, topic: string, s: ReviewState): ReviewStateRow {
  return {
    user_id: userId,
    topic,
    reps: s.reps,
    lapses: s.lapses,
    interval_days: s.intervalDays,
    ease: s.ease,
    due_at: new Date(s.dueMs).toISOString(),
    last_review_at: s.lastReviewMs === null ? null : new Date(s.lastReviewMs).toISOString(),
  };
}

/**
 * DB 行を ReviewState ドメインオブジェクトへ変換する。
 * zod で検証し、失敗時は `"review_states table, user=<userId> topic=<topic>"` を含むエラーを投げる（I-022）。
 */
export function rowToReviewState(r: ReviewStateRow): ReviewState {
  const result = reviewStateRowSchema.safeParse(r);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`review_states table, user=${r.user_id} topic=${r.topic}: ${issues}`);
  }
  const d = result.data;
  return {
    reps: d.reps,
    lapses: d.lapses,
    intervalDays: d.interval_days,
    ease: d.ease,
    dueMs: new Date(d.due_at).getTime(),
    lastReviewMs: d.last_review_at === null ? null : new Date(d.last_review_at).getTime(),
  };
}

/** zod スキーマ: answer_logs テーブル行の最小検証。 */
const answerLogRowSchema = z.object({
  topic: z.string().min(1),
  correct: z.boolean(),
  time_ms: z.number().nullable(),
  answered_at: z.string().datetime({ offset: true }),
  problem_id: z.string().nullable(),
});

/**
 * DB 行を AnswerLog ドメインオブジェクトへ変換する。
 * zod で検証し、失敗時は `"answer_logs table, user=<userId>"` を含むエラーを投げる（I-022）。
 */
function rowToAnswerLog(r: Record<string, unknown>, userId: string): AnswerLog {
  const result = answerLogRowSchema.safeParse(r);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`answer_logs table, user=${userId}: ${issues}`);
  }
  const d = result.data;
  return {
    topic: d.topic,
    correct: d.correct,
    atMs: new Date(d.answered_at).getTime(),
    ...(d.time_ms !== null && d.time_ms !== undefined ? { timeMs: d.time_ms } : {}),
    ...(d.problem_id !== null && d.problem_id !== undefined ? { problemId: d.problem_id } : {}),
  };
}

// ── ストア実装（薄い I/O ラッパ）──────────────────────────────────────────

export class SupabaseProblemStore implements ProblemStore {
  constructor(private client: SupabaseClient) {}

  async upsert(p: Problem): Promise<void> {
    const { error } = await this.client.from("problems").upsert(problemToRow(p));
    if (error) fail("problems.upsert", error);
  }

  async get(id: string): Promise<Problem | undefined> {
    const { data, error } = await this.client.from("problems").select("*").eq("id", id).maybeSingle();
    if (error) fail("problems.get", error);
    return data ? rowToProblem(data as ProblemRow) : undefined;
  }

  async list(filter?: { status?: Problem["status"]; topic?: string }): Promise<Problem[]> {
    let q = this.client.from("problems").select("*");
    if (filter?.status) q = q.eq("status", filter.status);
    if (filter?.topic) q = q.eq("topic", filter.topic);
    const { data, error } = await q;
    if (error) fail("problems.list", error);
    return (data ?? []).map((r) => rowToProblem(r as ProblemRow));
  }
}

export class SupabaseAnswerLogStore implements AnswerLogStore {
  constructor(private client: SupabaseClient) {}

  async append(userId: string, log: AnswerLog): Promise<void> {
    const { error } = await this.client.from("answer_logs").insert({
      user_id: userId,
      problem_id: log.problemId ?? null,
      topic: log.topic,
      correct: log.correct,
      time_ms: log.timeMs ?? null,
      answered_at: new Date(log.atMs).toISOString(),
    });
    if (error) fail("answer_logs.insert", error);
  }

  async byUser(userId: string): Promise<AnswerLog[]> {
    const { data, error } = await this.client
      .from("answer_logs")
      .select("topic, correct, time_ms, answered_at, problem_id")
      .eq("user_id", userId)
      .order("answered_at", { ascending: true });
    if (error) fail("answer_logs.byUser", error);
    return (data ?? []).map((r: Record<string, unknown>) => rowToAnswerLog(r, userId));
  }
}

export class SupabaseReviewStateStore implements ReviewStateStore {
  constructor(private client: SupabaseClient) {}

  async get(userId: string, topic: string): Promise<ReviewState | undefined> {
    const { data, error } = await this.client
      .from("review_states")
      .select("*")
      .eq("user_id", userId)
      .eq("topic", topic)
      .maybeSingle();
    if (error) fail("review_states.get", error);
    return data ? rowToReviewState(data as ReviewStateRow) : undefined;
  }

  async set(userId: string, topic: string, state: ReviewState): Promise<void> {
    const { error } = await this.client.from("review_states").upsert(reviewStateToRow(userId, topic, state));
    if (error) fail("review_states.upsert", error);
  }

  async byUser(userId: string): Promise<Map<string, ReviewState>> {
    const { data, error } = await this.client.from("review_states").select("*").eq("user_id", userId);
    if (error) fail("review_states.byUser", error);
    const out = new Map<string, ReviewState>();
    for (const r of data ?? []) {
      const row = r as ReviewStateRow;
      out.set(row.topic, rowToReviewState(row));
    }
    return out;
  }
}

/**
 * URL と key（service_role か anon）から3ストアをまとめて作る。
 * url または key が空文字・空白のみの場合は早期に例外を投げる（I-024）。
 */
export function createSupabaseStores(url: string, key: string) {
  if (!url.trim()) throw new Error("createSupabaseStores: url が空です");
  if (!key.trim()) throw new Error("createSupabaseStores: key が空です");
  const client = createClient(url, key);
  return {
    problems: new SupabaseProblemStore(client),
    answerLogs: new SupabaseAnswerLogStore(client),
    reviewStates: new SupabaseReviewStateStore(client),
  };
}
