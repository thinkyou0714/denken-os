/**
 * lapse-queue.ts — 問題単位の relearning キュー（SCHED-LAPSE-QUEUE）。
 * topic 単位の SM-2/FSRS とは別に、「さっき外した“その問題”」を少し時間を空けて再出題する
 * spaced retrieval を問題粒度で実現する。状態は problemId → 再出題予定(dueMs) の純データ。
 */
export type LapseMap = Record<string, number>;

/** 誤答後に再出題するまでの既定間隔（10分。セッション内/次セッションで再会する）。 */
export const RELEARN_MS = 10 * 60 * 1000;

/** 採点を反映: 誤答なら now+relearnMs に再出題予定、正解なら卒業(削除)。 */
export function updateLapse(
  map: LapseMap,
  problemId: string,
  correct: boolean,
  nowMs: number,
  relearnMs = RELEARN_MS,
): LapseMap {
  const next = { ...map };
  if (correct) delete next[problemId];
  else next[problemId] = nowMs + relearnMs;
  return next;
}

/** 再出題予定が到来した問題ID（古い予定順）。 */
export function dueLapseIds(map: LapseMap, nowMs: number): string[] {
  return Object.entries(map)
    .filter(([, due]) => due <= nowMs)
    .sort((a, b) => a[1] - b[1])
    .map(([id]) => id);
}
