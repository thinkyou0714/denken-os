/**
 * scheduler/index.ts — スケジューラの公開 API。
 *
 * ## スケジューラ選択の根拠（II-132）
 *
 * | アルゴリズム | 特徴                                                    | 選択基準                             |
 * |-------------|--------------------------------------------------------|--------------------------------------|
 * | FSRS        | 記憶安定度・難易度をパラメータとして持つ最新アルゴリズム。 | **既定**。精度・保持率制御が優れる。 |
 * | SM-2        | Wozniak 1990の古典アルゴリズム。シンプルで解釈しやすい。  | テスト・比較・後方互換に使用。       |
 *
 * `getScheduler("fsrs")` は `FsrsScheduler` インスタンスを、
 * `getScheduler("sm2")` は `Sm2Scheduler` インスタンスを返す。
 * 既定は FSRS（現行アプリの動作と一致）。
 */
export * from "./diagnosis.js";
export {
  type ExamAwareParams,
  examAwareParams,
} from "./exam-aware.js";
export { FsrsScheduler, type FsrsView, reviveCard, type StoredCard, toStoredCard } from "./fsrs.js";
export { Sm2Scheduler } from "./sm2.js";
export type { Rating, ReviewState, Scheduler } from "./types.js";

import { FsrsScheduler } from "./fsrs.js";
import { Sm2Scheduler } from "./sm2.js";

/** サポートするスケジューラの識別子。 */
export type SchedulerKind = "fsrs" | "sm2";

/**
 * スケジューラ種別を type-safe に選択して返すファクトリ（II-132）。
 *
 * @param kind - `"fsrs"`（既定・推奨）または `"sm2"`（後方互換・比較用）。
 * @param options - スケジューラ固有のオプション。
 * @param options.desiredRetention - FSRS の目標保持率（既定 0.9）。fsrs 選択時のみ有効。
 * @param options.maximumIntervalDays - FSRS の最大間隔（日）。試験日逆算（exam-aware）で
 *   試験日を越える復習を組まないために使う。fsrs 選択時のみ有効。
 * @returns 選択されたスケジューラのインスタンス。
 *
 * @example
 * ```ts
 * const scheduler = getScheduler("fsrs"); // 既定の FSRS
 * const exam = getScheduler("fsrs", { desiredRetention: 0.92, maximumIntervalDays: 14 });
 * const sm2 = getScheduler("sm2");        // SM-2（比較・テスト用）
 * ```
 */
export function getScheduler(
  kind: "fsrs",
  options?: { desiredRetention?: number; maximumIntervalDays?: number },
): FsrsScheduler;
export function getScheduler(kind: "sm2"): Sm2Scheduler;
export function getScheduler(
  kind: SchedulerKind = "fsrs",
  options?: { desiredRetention?: number; maximumIntervalDays?: number },
): FsrsScheduler | Sm2Scheduler {
  switch (kind) {
    case "fsrs":
      return new FsrsScheduler(options?.desiredRetention, options?.maximumIntervalDays);
    case "sm2":
      return new Sm2Scheduler();
    default: {
      // 網羅性ガード: SchedulerKind に種別を追加して未対応なら、ここで型エラーになる（将来のミス検出）。
      // 実行時に型を迂回した不正な kind が来た場合も明示的に失敗させる。
      const _exhaustive: never = kind;
      throw new Error(`未知のスケジューラ種別: ${String(_exhaustive)}`);
    }
  }
}
