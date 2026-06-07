/**
 * topic-state.ts — topic の学習状態(learning/graduated/relapsed)を判定する（D12）。
 * 「もう卒業」「再び崩れた」を明示状態にすると診断が安定し、進捗の物語(○個克服)を見せられる。
 * mastery(D4) と overdue を使う純関数。
 */
export type TopicState = "learning" | "graduated" | "relapsed";

export function classifyTopic(opts: { mastery: number; overdueDays: number }): TopicState {
  if (opts.overdueDays > 0 && opts.mastery < 0.6) return "relapsed";
  if (opts.mastery >= 0.85) return "graduated";
  return "learning";
}
