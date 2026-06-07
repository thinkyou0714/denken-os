/**
 * attempt.ts — 誤答時の2回目挑戦ループの状態遷移（純ロジック・PEDX-01）。
 * 初回誤答で即「正解:X」+解説を全開示すると retrieval が1回で終わり「分かった気」を生む。
 * reveal を1段遅らせ、初回誤答(択一/数値)では解説を出さず再挑戦させ、2回目 or 正解で reveal する。
 * record() は最終結果で1回だけ呼ぶための判断材料を返す（SM-2/ログの二重計上を防ぐ）。
 */
export type AttemptOutcome = { kind: "retry" } | { kind: "reveal"; correct: boolean };

export function nextAttemptState(opts: {
  format?: string;
  correct: boolean;
  attemptNo: number; // 1-based
  maxAttempts?: number;
}): AttemptOutcome {
  const max = opts.maxAttempts ?? 2;
  // 記述(descriptive)は自己採点フローなので常に reveal。
  if (opts.format === "descriptive") return { kind: "reveal", correct: opts.correct };
  if (opts.correct) return { kind: "reveal", correct: true };
  if (opts.attemptNo < max) return { kind: "retry" };
  return { kind: "reveal", correct: false };
}
