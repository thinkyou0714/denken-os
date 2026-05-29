/**
 * supabase-store.ts — store インターフェースの Supabase 実装（05 / supabase/migrations の DDL に対応）。
 *
 * 既定はインメモリ/ファイル実装。本実装は認証取得後（human-tasks.md）に
 *   const stores = createSupabaseStores(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!)
 * で差し込む。行⇔ドメインのマッピングは純関数として切り出し、テスト可能にしている
 * （実 I/O は薄いラッパ）。
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Problem } from "../engine/schema.js";
import type { AnswerLog } from "../scheduler/diagnosis.js";
import type { ReviewState } from "../scheduler/types.js";
import type { AnswerLogStore, ProblemStore, ReviewStateStore } from "./index.js";

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

export function rowToProblem(r: ProblemRow): Problem {
  return {
    id: r.id,
    exam: (r.exam ?? undefined) as Problem["exam"],
    subject: r.subject as Problem["subject"],
    topic: r.topic,
    format: r.format as Problem["format"],
    difficulty: r.difficulty,
    statement: r.statement,
    choices: r.choices ?? undefined,
    answer: r.answer,
    solution: r.solution,
    validation: r.validation,
    source: r.source,
    stats: r.stats ?? undefined,
    status: r.status as Problem["status"],
  };
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

export function rowToReviewState(r: ReviewStateRow): ReviewState {
  return {
    reps: r.reps,
    lapses: r.lapses,
    intervalDays: r.interval_days,
    ease: r.ease,
    dueMs: new Date(r.due_at).getTime(),
    lastReviewMs: r.last_review_at === null ? null : new Date(r.last_review_at).getTime(),
  };
}

// ── ストア実装（薄い I/O ラッパ）──────────────────────────────────────────

export class SupabaseProblemStore implements ProblemStore {
  constructor(private client: SupabaseClient) {}

  async upsert(p: Problem): Promise<void> {
    const { error } = await this.client.from("problems").upsert(problemToRow(p));
    if (error) throw new Error(`problems upsert failed: ${error.message}`);
  }

  async get(id: string): Promise<Problem | undefined> {
    const { data, error } = await this.client.from("problems").select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(`problems get failed: ${error.message}`);
    return data ? rowToProblem(data as ProblemRow) : undefined;
  }

  async list(filter?: { status?: Problem["status"]; topic?: string }): Promise<Problem[]> {
    let q = this.client.from("problems").select("*");
    if (filter?.status) q = q.eq("status", filter.status);
    if (filter?.topic) q = q.eq("topic", filter.topic);
    const { data, error } = await q;
    if (error) throw new Error(`problems list failed: ${error.message}`);
    return (data ?? []).map((r) => rowToProblem(r as ProblemRow));
  }
}

export class SupabaseAnswerLogStore implements AnswerLogStore {
  constructor(private client: SupabaseClient) {}

  async append(userId: string, log: AnswerLog): Promise<void> {
    const { error } = await this.client.from("answer_logs").insert({
      user_id: userId,
      problem_id: null,
      topic: log.topic,
      correct: log.correct,
      time_ms: log.timeMs ?? null,
      answered_at: new Date(log.atMs).toISOString(),
    });
    if (error) throw new Error(`answer_logs insert failed: ${error.message}`);
  }

  async byUser(userId: string): Promise<AnswerLog[]> {
    const { data, error } = await this.client
      .from("answer_logs")
      .select("topic, correct, time_ms, answered_at")
      .eq("user_id", userId);
    if (error) throw new Error(`answer_logs byUser failed: ${error.message}`);
    return (data ?? []).map((r: Record<string, unknown>) => ({
      topic: r.topic as string,
      correct: r.correct as boolean,
      timeMs: (r.time_ms as number | null) ?? undefined,
      atMs: new Date(r.answered_at as string).getTime(),
    }));
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
    if (error) throw new Error(`review_states get failed: ${error.message}`);
    return data ? rowToReviewState(data as ReviewStateRow) : undefined;
  }

  async set(userId: string, topic: string, state: ReviewState): Promise<void> {
    const { error } = await this.client.from("review_states").upsert(reviewStateToRow(userId, topic, state));
    if (error) throw new Error(`review_states upsert failed: ${error.message}`);
  }

  async byUser(userId: string): Promise<Map<string, ReviewState>> {
    const { data, error } = await this.client.from("review_states").select("*").eq("user_id", userId);
    if (error) throw new Error(`review_states byUser failed: ${error.message}`);
    const out = new Map<string, ReviewState>();
    for (const r of data ?? []) {
      const row = r as ReviewStateRow;
      out.set(row.topic, rowToReviewState(row));
    }
    return out;
  }
}

/** URL と key（service_role か anon）から3ストアをまとめて作る。 */
export function createSupabaseStores(url: string, key: string) {
  const client = createClient(url, key);
  return {
    problems: new SupabaseProblemStore(client),
    answerLogs: new SupabaseAnswerLogStore(client),
    reviewStates: new SupabaseReviewStateStore(client),
  };
}
