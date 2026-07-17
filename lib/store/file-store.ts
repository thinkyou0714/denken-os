/**
 * file-store.ts — JSON ファイル永続化の store 実装（II-140）。
 * インメモリと違い再起動後も残るため、CLI 生成物の保管や小規模運用に使える
 * （Supabase 実装と同じインターフェース。supabase/migrations の DDL に対応）。
 *
 * ## 並行性・トランザクション制限（II-140）
 *
 * - **単一プロセス前提**: ファイルストアは1プロセスからの逐次アクセスを想定している。
 *   複数プロセスが同じファイルを同時に読み書きすると race condition が発生しうる。
 * - **原子的書き込み**: `writeJson` は一時ファイルに書いてから `rename` で差し替えるため、
 *   書き込み途中のクラッシュで本体ファイルが破損することはない（read-after-write は安全）。
 * - **トランザクションなし**: 複数ストア（problems + answerLogs）を跨ぐ操作は原子ではない。
 *   半端な状態が残る可能性があるため、本番用途には Supabase ストアを使うこと。
 * - **同一プロセス内の並行**: Node.js はシングルスレッドだが `await` の境界で
 *   他の非同期処理が割り込める。現実装は read-modify-write を同期的に行うため
 *   同一プロセス内での同時書き込みも競合しない（`readFileSync`/`writeFileSync` 使用）。
 */
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Problem } from "../engine/schema.js";
import type { AnswerLog } from "../scheduler/diagnosis.js";
import type { ReviewState } from "../scheduler/types.js";
import type { AnswerLogStore, Entitlement, EntitlementStore, ProblemStore, ReviewStateStore } from "./index.js";

function readJson<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(file, "utf8")) as T;
  } catch (err) {
    // SyntaxError = JSON 破損 → 診断可能なように warn を出してから fallback（I-025）。
    // ENOENT（ファイル未作成）等は無音で fallback（従来どおり）。
    if (err instanceof SyntaxError) {
      console.warn(`file-store: JSON 破損を検出、fallback を返します (${file}):`, err.message);
    }
    return fallback;
  }
}

function writeJson(file: string, data: unknown): void {
  mkdirSync(dirname(file), { recursive: true });
  // 原子的書き込み: 一時ファイルに書いてから rename で差し替える。
  // 途中でクラッシュしても本体ファイルが半端な内容で壊れない（読み側の JSON.parse 失敗を防ぐ）。
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  renameSync(tmp, file);
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
    // 契約は「atMs 昇順」。Supabase 実装は DB の order で保証するため、
    // 追記順に依存せずここでもソートして 3 実装の挙動を揃える。
    return [...(this.load()[userId] ?? [])].sort((a, b) => a.atMs - b.atMs);
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

export class FileEntitlementStore implements EntitlementStore {
  constructor(private file: string) {}

  private load(): Record<string, Entitlement> {
    return readJson<Record<string, Entitlement>>(this.file, {});
  }

  async get(userId: string): Promise<Entitlement | undefined> {
    return this.load()[userId];
  }
  async byStripeCustomer(customerId: string): Promise<Entitlement | undefined> {
    return Object.values(this.load()).find((e) => e.stripeCustomerId === customerId);
  }
  async upsert(e: Entitlement): Promise<void> {
    const all = this.load();
    all[e.userId] = e;
    writeJson(this.file, all);
  }
}

/** 既定の保存先ディレクトリにまとめて生成するヘルパ。 */
export function fileStores(dir: string) {
  return {
    problems: new FileProblemStore(join(dir, "problems.json")),
    answerLogs: new FileAnswerLogStore(join(dir, "answer-logs.json")),
    reviewStates: new FileReviewStateStore(join(dir, "review-states.json")),
    entitlements: new FileEntitlementStore(join(dir, "entitlements.json")),
  };
}
