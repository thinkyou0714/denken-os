/**
 * file-store.ts — JSON ファイル永続化の store 実装。
 * インメモリと違い再起動後も残るため、CLI 生成物の保管や小規模運用に使える
 * （Supabase 実装と同じインターフェース。supabase/migrations の DDL に対応）。
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Problem } from "../engine/schema.js";
import type { AnswerLog } from "../scheduler/diagnosis.js";
import type { ReviewState } from "../scheduler/types.js";
import type { AnswerLogStore, ProblemStore, ReviewStateStore } from "./index.js";

function readJson<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function writeJson(file: string, data: unknown): void {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export class FileProblemStore implements ProblemStore {
  constructor(private file: string) {}

  private load(): Record<string, Problem> {
    return readJson<Record<string, Problem>>(this.file, {});
  }

  async upsert(p: Problem): Promise<void> {
    const all = this.load();
    all[p.id] = p;
    writeJson(this.file, all);
  }
  async get(id: string): Promise<Problem | undefined> {
    return this.load()[id];
  }
  async list(filter?: { status?: Problem["status"]; topic?: string }): Promise<Problem[]> {
    return Object.values(this.load()).filter(
      (p) =>
        (filter?.status === undefined || p.status === filter.status) &&
        (filter?.topic === undefined || p.topic === filter.topic),
    );
  }
}

export class FileAnswerLogStore implements AnswerLogStore {
  constructor(private file: string) {}

  private load(): Record<string, AnswerLog[]> {
    return readJson<Record<string, AnswerLog[]>>(this.file, {});
  }

  async append(userId: string, log: AnswerLog): Promise<void> {
    const all = this.load();
    const arr = all[userId] ?? [];
    arr.push(log);
    all[userId] = arr;
    writeJson(this.file, all);
  }
  async byUser(userId: string): Promise<AnswerLog[]> {
    return [...(this.load()[userId] ?? [])];
  }
}

export class FileReviewStateStore implements ReviewStateStore {
  constructor(private file: string) {}

  private load(): Record<string, Record<string, ReviewState>> {
    return readJson<Record<string, Record<string, ReviewState>>>(this.file, {});
  }

  async get(userId: string, topic: string): Promise<ReviewState | undefined> {
    return this.load()[userId]?.[topic];
  }
  async set(userId: string, topic: string, state: ReviewState): Promise<void> {
    const all = this.load();
    const byTopic = all[userId] ?? {};
    byTopic[topic] = state;
    all[userId] = byTopic;
    writeJson(this.file, all);
  }
  async byUser(userId: string): Promise<Map<string, ReviewState>> {
    return new Map(Object.entries(this.load()[userId] ?? {}));
  }
}

/** 既定の保存先ディレクトリにまとめて生成するヘルパ。 */
export function fileStores(dir: string) {
  return {
    problems: new FileProblemStore(join(dir, "problems.json")),
    answerLogs: new FileAnswerLogStore(join(dir, "answer-logs.json")),
    reviewStates: new FileReviewStateStore(join(dir, "review-states.json")),
  };
}
