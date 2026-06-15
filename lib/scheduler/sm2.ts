/**
 * sm2.ts — SM-2 ベースの軽量スケジューラ（MVP）。
 * インターフェースを切ってあるので、後で FSRS に差し替えられる
 * (05-adaptive-diagnosis: 「MVP は SM-2 でも可。後で FSRS に差替え可能に」)。
 *
 * ## SM-2 アルゴリズムの根拠（Wozniak 1990）
 * SM-2 は Piotr Wozniak が SuperMemo 2 で公開した間隔反復アルゴリズム。
 * 参照: Wozniak P.A. (1990). "A theoretical aspect of spaced repetition".
 *   Computer Science and Biology, vol. 1, pp.73-87.
 *   https://www.supermemo.com/english/ol/sm2.htm
 *
 * ease（EF: Easiness Factor）は 1.3 を下限とする。上限は意図的に設けない:
 *   - 上限を設けると超優秀カードの次回間隔が人為的に短縮され記憶効率が下がる
 *   - Wozniak の元仕様も上限なし
 *   - ただし ease が異常値（>100）になった場合はデータ破損の可能性があるため warning を出す
 */
import { DAY_MS, type Rating, type ReviewState, type Scheduler } from "./types.js";

const MIN_EASE = 1.3;
/** ease 異常値の警告しきい値。この値を超えるとデータ破損の可能性がある（II-130）。 */
const EASE_WARN_THRESHOLD = 100;

function qualityOf(rating: Rating): number {
  switch (rating) {
    case "again":
      return 1;
    case "hard":
      return 3;
    case "good":
      return 4;
    case "easy":
      return 5;
  }
}

export class Sm2Scheduler implements Scheduler {
  init(nowMs: number = Date.now()): ReviewState {
    return { reps: 0, lapses: 0, intervalDays: 0, ease: 2.5, dueMs: nowMs, lastReviewMs: null, createdAtMs: nowMs };
  }

  review(state: ReviewState, rating: Rating, nowMs: number = Date.now()): ReviewState {
    const q = qualityOf(rating);
    let { reps, lapses, intervalDays, ease } = state;

    if (q < 3) {
      // 不正解: 連続正解リセット・即再出題（間隔を縮める）。
      reps = 0;
      lapses += 1;
      intervalDays = 0; // 当日中に再出題
    } else {
      reps += 1;
      if (reps === 1) intervalDays = 1;
      else if (reps === 2) intervalDays = 6;
      else intervalDays = Math.round(intervalDays * ease);
    }

    // SM-2 の ease 更新式（Wozniak 1990, SM-2 仕様の式 EF' = EF + (0.1 − (5−q)·(0.08 + (5−q)·0.02))）。
    // ease の上限は意図的に設けていない。標準 SM-2 仕様は上限なしであり、
    // 上限を設けると超優秀カードの間隔が人為的に短縮されて記憶効率が下がる。
    // 下限 MIN_EASE(1.3) だけ設けてカード間隔の底割れを防ぐ設計。
    ease = ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
    if (ease < MIN_EASE) ease = MIN_EASE;

    // ease 暴走監視（II-130）: 正常域を大きく外れた場合は警告する（バグ・データ破損の検出）。
    if (ease > EASE_WARN_THRESHOLD) {
      console.warn(
        `Sm2Scheduler: ease が異常値 ${ease.toFixed(4)} になりました（しきい値: ${EASE_WARN_THRESHOLD}）。データ破損の可能性があります。`,
      );
    }

    return {
      reps,
      lapses,
      intervalDays,
      ease: Number(ease.toFixed(4)),
      dueMs: nowMs + intervalDays * DAY_MS,
      lastReviewMs: nowMs,
      // createdAtMs を引き継ぐ（II-141）: review ではカードの生成時刻は変わらない。
      ...(state.createdAtMs !== undefined ? { createdAtMs: state.createdAtMs } : {}),
    };
  }
}
