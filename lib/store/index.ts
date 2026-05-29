/**
 * store/index.ts — 永続化の抽象（03 stats / 05 解答履歴・記憶状態の保存先）。
 *
 * 設計: インターフェースを切り、既定はインメモリ実装。Supabase 実装は
 * このインターフェースを満たすアダプタとして後から差し込む（human-tasks の認証取得後）。
 * これにより 03/05 のロジックを実DBなしでエンドツーエンドにテストできる。
 */
import type { Problem } from "../engine/schema.js";
import type { AnswerLog } from "../scheduler/diagnosis.js";
import type { ReviewState } from "../scheduler/types.js";

export interface ProblemStore {
  upsert(p: Problem): Promise<void>;
  get(id: string): Promise<Problem | undefined>;
  list(filter?: { status?: Problem["status"]; topic?: string }): Promise<Problem[]>;
}

export interface AnswerLogStore {
  append(userId: string, log: AnswerLog): Promise<void>;
  byUser(userId: string): Promise<AnswerLog[]>;
}

export interface ReviewStateStore {
  /** ユーザー×論点の記憶状態を取得（無ければ undefined）。 */
  get(userId: string, topic: string): Promise<ReviewState | undefined>;
  set(userId: string, topic: string, state: ReviewState): Promise<void>;
  byUser(userId: string): Promise<Map<string, ReviewState>>;
}

export class InMemoryProblemStore implements ProblemStore {
  private map = new Map<string, Problem>();
  async upsert(p: Problem): Promise<void> {
    this.map.set(p.id, p);
  }
  async get(id: string): Promise<Problem | undefined> {
    return this.map.get(id);
  }
  async list(filter?: { status?: Problem["status"]; topic?: string }): Promise<Problem[]> {
    return [...this.map.values()].filter(
      (p) =>
        (filter?.status === undefined || p.status === filter.status) &&
        (filter?.topic === undefined || p.topic === filter.topic),
    );
  }
}

export class InMemoryAnswerLogStore implements AnswerLogStore {
  private byUserMap = new Map<string, AnswerLog[]>();
  async append(userId: string, log: AnswerLog): Promise<void> {
    const arr = this.byUserMap.get(userId) ?? [];
    arr.push(log);
    this.byUserMap.set(userId, arr);
  }
  async byUser(userId: string): Promise<AnswerLog[]> {
    return [...(this.byUserMap.get(userId) ?? [])];
  }
}

export class InMemoryReviewStateStore implements ReviewStateStore {
  private map = new Map<string, ReviewState>();
  private key(userId: string, topic: string): string {
    return `${userId}::${topic}`;
  }
  async get(userId: string, topic: string): Promise<ReviewState | undefined> {
    return this.map.get(this.key(userId, topic));
  }
  async set(userId: string, topic: string, state: ReviewState): Promise<void> {
    this.map.set(this.key(userId, topic), state);
  }
  async byUser(userId: string): Promise<Map<string, ReviewState>> {
    const out = new Map<string, ReviewState>();
    const prefix = `${userId}::`;
    for (const [k, v] of this.map) {
      if (k.startsWith(prefix)) out.set(k.slice(prefix.length), v);
    }
    return out;
  }
}
