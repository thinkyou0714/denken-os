import type { Card } from "ts-fsrs";
import { newCard, review, reviveCard, type Grade4 } from "@/domain/srs/scheduler";
import type { StorageBackend } from "@/domain/storage/backend";

export interface ReviewRecord {
  problemId: string;
  grade: Grade4;
  correct: boolean;
  reviewedAt: string; // ISO 8601
}

interface PersistShape {
  version: 1;
  cards: Record<string, unknown>;
  logs: ReviewRecord[];
}

function emptyState(): PersistShape {
  return { version: 1, cards: {}, logs: [] };
}

/**
 * 学習進捗(FSRS カード状態 + 復習ログ)の読み書きを担うフレームワーク非依存ストア。
 * StorageBackend 経由で永続化するため、テストでもインメモリで完全に検証できる。
 */
export class ProgressStore {
  private state: PersistShape;

  constructor(private readonly backend: StorageBackend) {
    this.state = this.load();
  }

  private load(): PersistShape {
    const raw = this.backend.read();
    if (!raw) return emptyState();
    try {
      const parsed = JSON.parse(raw) as Partial<PersistShape>;
      return {
        version: 1,
        cards: parsed.cards ?? {},
        logs: parsed.logs ?? [],
      };
    } catch {
      return emptyState();
    }
  }

  private persist(): void {
    this.backend.write(JSON.stringify(this.state));
  }

  getCard(problemId: string): Card | null {
    const raw = this.state.cards[problemId];
    return raw ? reviveCard(raw as Record<string, unknown>) : null;
  }

  /** 既存カード、なければ新規カードを返す(復習対象の判定に使う)。 */
  cardFor(problemId: string, now: Date = new Date()): Card {
    return this.getCard(problemId) ?? newCard(now);
  }

  /** 1 回分の解答を記録し、更新後のカードを返す。 */
  recordReview(
    problemId: string,
    grade: Grade4,
    correct: boolean,
    now: Date = new Date(),
  ): Card {
    const { card } = review(this.cardFor(problemId, now), grade, now);
    this.state.cards[problemId] = card;
    this.state.logs.push({
      problemId,
      grade,
      correct,
      reviewedAt: now.toISOString(),
    });
    this.persist();
    return card;
  }

  logs(): ReviewRecord[] {
    return this.state.logs;
  }

  logsFor(problemId: string): ReviewRecord[] {
    return this.state.logs.filter((l) => l.problemId === problemId);
  }

  reset(): void {
    this.state = emptyState();
    this.persist();
  }

  /** 進捗を JSON 文字列に書き出す(端末移行・バックアップ用)。 */
  snapshot(): string {
    return JSON.stringify(this.state);
  }

  /**
   * JSON 文字列から進捗を復元する。
   * - 形式が想定外(version 不一致、cards/logs の型違い等)なら false を返し既存状態は維持。
   * - 正常に復元できれば true。
   */
  restore(serialized: string): boolean {
    let parsed: unknown;
    try {
      parsed = JSON.parse(serialized);
    } catch {
      return false;
    }
    if (typeof parsed !== "object" || parsed === null) return false;
    const obj = parsed as Record<string, unknown>;
    if (obj.version !== 1) return false;
    if (typeof obj.cards !== "object" || obj.cards === null) return false;
    if (!Array.isArray(obj.logs)) return false;
    this.state = {
      version: 1,
      cards: obj.cards as Record<string, unknown>,
      logs: obj.logs as ReviewRecord[],
    };
    this.persist();
    return true;
  }
}
