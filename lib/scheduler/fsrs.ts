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
  fsrs,
  type FSRS,
  generatorParameters,
  type Grade,
  Rating as FsrsRating,
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
    case "again": return FsrsRating.Again;
    case "hard": return FsrsRating.Hard;
    case "good": return FsrsRating.Good;
    case "easy": return FsrsRating.Easy;
  }
}

export class FsrsScheduler {
  private engine: FSRS;
  readonly desiredRetention: number;

  constructor(desiredRetention = 0.9) {
    this.desiredRetention = desiredRetention;
    this.engine = fsrs(generatorParameters({ request_retention: desiredRetention }));
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
