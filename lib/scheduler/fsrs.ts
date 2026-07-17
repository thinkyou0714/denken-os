/**
 * fsrs.ts — FSRS (Free Spaced Repetition Scheduler) アダプタ。
 * 05-adaptive-diagnosis のベストプラクティス: 「独自発明せず実績ある FSRS を使う」。
 * 目標保持率(desired retention, 既定0.9) が最重要設定で、上げると間隔が短くなる。
 *
 * 実装は ts-fsrs に委譲。ライブラリ Card をそのまま状態として持ち回り、
 * UI/DB 用に最小限のビュー(FsrsView)へ射影する。
 */
import {
  type Card,
  createEmptyCard,
  type FSRS,
  Rating as FsrsRating,
  fsrs,
  type Grade,
  generatorParameters,
} from "ts-fsrs";
import type { Rating } from "./types.js";

export interface FsrsView {
  dueMs: number;
  stability: number;
  difficulty: number;
  reps: number;
  lapses: number;
  scheduledDays: number;
}

// ── Card の永続化境界（serialize/deserialize）─────────────────────────────
// ts-fsrs の Card は Date フィールド（due / last_review）を持つ。「どのフィールドが
// Date か」という知識はライブラリのバージョンに依存するため、ts-fsrs を import する
// 唯一のこのモジュールに集約する。呼び出し側（web の localStorage 等）が Card の
// 内部形を知って独自変換すると、ts-fsrs 更新で Date フィールドが増えた際に
// 保存データが黙って壊れる。

/** JSON 保存用の Card（Date フィールドを ISO 文字列にしたもの）。 */
export type StoredCard = Omit<Card, "due" | "last_review"> & { due: string; last_review?: string };

/** Card → 保存形。JSON.stringify に安全に渡せる形へ明示変換する。 */
export function toStoredCard(card: Card): StoredCard {
  const { due, last_review, ...rest } = card;
  return {
    ...rest,
    due: new Date(due).toISOString(),
    ...(last_review !== undefined ? { last_review: new Date(last_review).toISOString() } : {}),
  };
}

/** 保存形 → Card。Date フィールドを復元する。 */
export function reviveCard(s: StoredCard): Card {
  return {
    ...s,
    due: new Date(s.due),
    last_review: s.last_review !== undefined ? new Date(s.last_review) : undefined,
  } as Card;
}

function toFsrsRating(r: Rating): Grade {
  switch (r) {
    case "again":
      return FsrsRating.Again;
    case "hard":
      return FsrsRating.Hard;
    case "good":
      return FsrsRating.Good;
    case "easy":
      return FsrsRating.Easy;
  }
}

export class FsrsScheduler {
  private engine: FSRS;
  readonly desiredRetention: number;
  /** 実効最大間隔（日）。試験日逆算（exam-aware）で試験日を越える復習を抑える。 */
  readonly maximumIntervalDays: number | undefined;

  /**
   * @param desiredRetention 目標保持率（FSRS の最重要設定。既定 0.9）。
   * @param maximumIntervalDays 最大間隔（日）。試験日逆算で渡すと、それより先の復習予定を組まない。
   *   未指定なら ts-fsrs 既定（実質無制限）。
   */
  constructor(desiredRetention = 0.9, maximumIntervalDays?: number) {
    this.desiredRetention = desiredRetention;
    this.maximumIntervalDays = maximumIntervalDays;
    this.engine = fsrs(
      generatorParameters({
        request_retention: desiredRetention,
        ...(maximumIntervalDays !== undefined
          ? { maximum_interval: Math.max(1, Math.floor(maximumIntervalDays)) }
          : {}),
      }),
    );
  }

  init(now: Date = new Date()): Card {
    return createEmptyCard(now);
  }

  /** 採点を反映して次回 Card を返す。 */
  review(card: Card, rating: Rating, now: Date = new Date()): Card {
    const log = this.engine.repeat(card, now);
    const next = log[toFsrsRating(rating)].card;
    // ts-fsrs は Hard<Good<Easy の間隔単調性を維持するため、maximum_interval での
    // クランプ後に Good+1 / Easy+2 日され、上限を最大2日超えうる（ソフトキャップ）。
    // exam-aware の「試験日を越える復習を組まない」保証にはハードキャップが必要なので、
    // due をここで上限に詰める（記憶状態 stability/difficulty は FSRS のまま保持する）。
    if (this.maximumIntervalDays !== undefined) {
      const capDays = Math.max(1, Math.floor(this.maximumIntervalDays));
      const capMs = now.getTime() + capDays * 24 * 3600_000;
      if (next.due.getTime() > capMs) {
        next.due = new Date(capMs);
        next.scheduled_days = Math.min(next.scheduled_days, capDays);
      }
    }
    return next;
  }

  view(card: Card): FsrsView {
    return {
      dueMs: new Date(card.due).getTime(),
      stability: card.stability,
      difficulty: card.difficulty,
      reps: card.reps,
      lapses: card.lapses,
      scheduledDays: card.scheduled_days,
    };
  }
}
