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
    return log[toFsrsRating(rating)].card;
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
