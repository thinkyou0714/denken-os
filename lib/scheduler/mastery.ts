/**
 * mastery.ts — topic の習熟度を直近重視で測る（D4: EWMA）。
 * 生の正答率は古い不正解と直近の正解を同じ重みで扱い「上り坂」を捉えられない。
 * 指数加重移動平均で直近の正誤を強く反映する mastery∈[0,1] を返す（中立 0.5 始点）。
 */
import type { AnswerLog } from "./diagnosis.js";

/** logs(時系列でなくてもよい。atMs 昇順に整列して処理)から topic の mastery を返す。 */
export function masteryEWMA(logs: AnswerLog[], topic: string, alpha = 0.3): number {
  const seq = logs.filter((l) => l.topic === topic).sort((a, b) => a.atMs - b.atMs);
  if (seq.length === 0) return 0.5; // 中立
  let m = 0.5;
  for (const l of seq) m = alpha * (l.correct ? 1 : 0) + (1 - alpha) * m;
  return m;
}
