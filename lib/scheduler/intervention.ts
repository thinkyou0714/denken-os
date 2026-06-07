/**
 * intervention.ts — 同 topic の連続誤答を検出し介入を決める（純ロジック）。
 * 同 topic を続けて外すと rate 低下で優先度が上がり、同難度が再出題される負ループ(frustration)。
 * 連続誤答 streak を検出して「解説強制」「易問へ降段」を返し、学習継続を支える。
 */
import type { AnswerLog } from "./diagnosis.js";

/** 指定 topic の「直近の連続誤答数」。間に正解が入ると 0 にリセットされる。他 topic は無視。 */
export function consecutiveFailures(logs: AnswerLog[], topic: string): number {
  let n = 0;
  for (let i = logs.length - 1; i >= 0; i -= 1) {
    const l = logs[i];
    if (!l || l.topic !== topic) continue;
    if (l.correct) break;
    n += 1;
  }
  return n;
}

export type InterventionAction = "none" | "force_explanation" | "ease_down";

/** 連続誤答数に応じた介入。2回で解説強制、3回以上で易問へ降段。 */
export function intervention(consecFails: number): InterventionAction {
  if (consecFails >= 3) return "ease_down";
  if (consecFails >= 2) return "force_explanation";
  return "none";
}
