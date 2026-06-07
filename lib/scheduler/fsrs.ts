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
  State,
} from "ts-fsrs";
import type { Rating, ReviewState, Scheduler } from "./types.js";

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

// ── ReviewState ⇔ ts-fsrs Card 変換（SCHED-1: FSRS を永続化経路に乗せる）─────────
// FSRS は ease を使わないため、ReviewState.ease は互換のための中立値(2.5)を入れる。
// stability/difficulty は ReviewState に通し、行ストア(B3)経由で往復保持される。

export function cardToReviewState(card: Card): ReviewState {
  return {
    reps: card.reps,
    lapses: card.lapses,
    intervalDays: card.scheduled_days,
    ease: 2.5,
    dueMs: new Date(card.due).getTime(),
    lastReviewMs: card.last_review ? new Date(card.last_review).getTime() : null,
    stability: card.stability,
    difficulty: card.difficulty,
  };
}

export function reviewStateToCard(s: ReviewState): Card {
  // createEmptyCard で全フィールド(ts-fsrs の版差異も含む)を満たした土台を作り、永続値で上書きする。
  const base = createEmptyCard(new Date(s.lastReviewMs ?? s.dueMs));
  // 後方互換: FSRS の stability が無い（SM-2 由来の旧状態）場合は FSRS 未学習として初期化する。
  // stability=0 のまま Review 状態で repeat すると NaN(stability/due null)を生むため。
  if (s.stability === undefined) return base;
  return {
    ...base,
    due: new Date(s.dueMs),
    stability: s.stability,
    difficulty: s.difficulty ?? base.difficulty,
    scheduled_days: s.intervalDays,
    reps: s.reps,
    lapses: s.lapses,
    state: s.reps > 0 ? State.Review : State.New,
    last_review: s.lastReviewMs === null ? undefined : new Date(s.lastReviewMs),
  };
}

/**
 * FSRS を Scheduler インターフェース(ReviewState in/out)として使えるアダプタ。
 * これにより Sm2Scheduler と置換可能になり、FSRS の stability/difficulty が
 * ReviewState 経由で永続化される（従来は Card 止まりで保存経路に乗らない dead code だった）。
 */
export class FsrsReviewScheduler implements Scheduler {
  private readonly engine: FsrsScheduler;

  constructor(desiredRetention = 0.9) {
    this.engine = new FsrsScheduler(desiredRetention);
  }

  init(nowMs: number = Date.now()): ReviewState {
    return cardToReviewState(this.engine.init(new Date(nowMs)));
  }

  review(state: ReviewState, rating: Rating, nowMs: number = Date.now()): ReviewState {
    return cardToReviewState(this.engine.review(reviewStateToCard(state), rating, new Date(nowMs)));
  }
}
