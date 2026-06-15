/**
 * aggregate.ts — 解答集計（03-answer-aggregator）。
 * 一次ソースは X アンケート(poll)。リプ番号解析は表記ゆれが大きいので補助のみ。
 * 純関数: poll 結果 → 正答率/最頻誤答 → stats 更新 + 難易度補正「提案」。
 */
import type { Problem } from "../engine/schema.js";

/** poll の各選択肢の得票（choices と同順）。 */
export interface PollResult {
  /** choices と同じ順序の票数。 */
  votes: number[];
}

export interface AggregateOutput {
  answered: number;
  correctRate: number;
  commonWrongChoice: string | null;
  /** 難易度の補正「提案」（自動上書きはしない＝人間承認）。 */
  difficultySuggestion: number;
  skipped?: "no_poll";
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/** 実測正答率から難易度★を提案する（低正答率ほど高難度）。 */
export function suggestDifficulty(correctRate: number): number {
  // rate 0.9+ → ★1, 0.75+ → ★2, 0.55+ → ★3, 0.35+ → ★4, それ未満 → ★5
  if (correctRate >= 0.9) return 1;
  if (correctRate >= 0.75) return 2;
  if (correctRate >= 0.55) return 3;
  if (correctRate >= 0.35) return 4;
  return 5;
}

/**
 * poll 結果を集計する。poll が無い場合は集計不可としてスキップを明示。
 */
export function aggregate(p: Problem, poll: PollResult | null): AggregateOutput {
  if (!poll || poll.votes.length === 0) {
    return {
      answered: 0,
      correctRate: 0,
      commonWrongChoice: null,
      difficultySuggestion: p.difficulty,
      skipped: "no_poll",
    };
  }
  const choices = p.choices ?? [];
  // votes と choices の対応がずれた入力（X poll は最大4択で choices が5件以上だと末尾が
  // poll に出ない等）でも、既知の選択肢に対応する票だけで集計する（防御）。
  if (poll.votes.length !== choices.length) {
    // 長さ不一致は通常の X poll 制約（最大4択）か設定ミスのため、診断用に警告する（I-026, II-134）。
    // 失われた要素の index 範囲を具体的に付与して、どの選択肢が集計されなかったかを明確にする。
    const keepN = Math.min(poll.votes.length, choices.length);
    const lostStart = keepN;
    const lostEndVotes = poll.votes.length - 1;
    const lostEndChoices = choices.length - 1;
    const lostDesc =
      poll.votes.length > choices.length
        ? `votes[${lostStart}..${lostEndVotes}] に対応する choices が存在しない`
        : `choices[${lostStart}..${lostEndChoices}] に対応する votes が存在しない（集計から除外）`;
    console.warn(
      `aggregate: votes.length(${poll.votes.length}) !== choices.length(${choices.length}) for problem ${p.id}. ` +
        `${lostDesc}。集計対象は index 0..${keepN - 1} のみ。`,
    );
  }
  const n = Math.min(poll.votes.length, choices.length);
  let total = 0;
  for (let i = 0; i < n; i++) total += poll.votes[i] ?? 0;
  const answerIdx = choices.indexOf(p.answer);
  const correct = answerIdx >= 0 && answerIdx < n ? (poll.votes[answerIdx] ?? 0) : 0;
  const correctRate = total > 0 ? clamp(correct / total, 0, 1) : 0;

  // 最頻誤答 = 正解以外で最多票の選択肢。
  let commonWrongChoice: string | null = null;
  let maxWrong = -1;
  for (let i = 0; i < n; i++) {
    if (i === answerIdx) continue;
    const v = poll.votes[i] ?? 0;
    if (v > maxWrong) {
      maxWrong = v;
      commonWrongChoice = choices[i] ?? null;
    }
  }

  return {
    answered: total,
    correctRate,
    commonWrongChoice: maxWrong > 0 ? commonWrongChoice : null,
    difficultySuggestion: suggestDifficulty(correctRate),
  };
}

/** stats を schema の範囲制約(answered>=0, rate∈[0,1])を満たす形で更新して返す。 */
export function applyStats(p: Problem, agg: AggregateOutput): Problem {
  return {
    ...p,
    stats: {
      answered: Math.max(0, Math.round(agg.answered)),
      correct_rate: clamp(agg.correctRate, 0, 1),
      common_wrong_choice: agg.commonWrongChoice ?? p.stats?.common_wrong_choice,
    },
  };
}
