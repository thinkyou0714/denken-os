/**
 * exam-plan.ts — 試験日からの「合格逆算ペース計画」（純関数・DOM非依存）。
 *
 * 合格ロジックの本丸: ゴール（試験日）と現状（科目別到達度）から逆算して
 *   「今日やるべき分量」と「弱点科目への配分」を決める。
 * 直感（なんとなく勉強）を、残り日数で割った具体的な日次目標に変える。
 */
import { PASS_LINE, type PassReadiness } from "./lesson.js";

const DAY_MS = 86_400_000;

/** 試験日までの残り日数（当日=0、過ぎていたら負）。UTC 日基準で安定。 */
export function daysUntil(examMs: number, nowMs: number): number {
  return Math.ceil((examMs - nowMs) / DAY_MS);
}

export interface ExamPlanInput {
  examMs: number;
  nowMs: number;
  /** 科目別の合格到達度（lesson.passReadiness の出力）。 */
  readiness: PassReadiness<string>[];
  /** 1日に解ける現実的な問題数（既定10）。 */
  dailyCapacity?: number;
}

export interface ExamPlan {
  daysLeft: number;
  /** 試験が過ぎている/当日。 */
  expired: boolean;
  /** 合格圏(>=60%)に届いていない科目（弱点。優先配分先）。 */
  behindSubjects: string[];
  /** 今日の推奨問題数（弱点が多い・残り日数が少ないほど増える）。 */
  todayTarget: number;
  /** 重点配分すべき科目（behind を残り日数で均す並び）。 */
  focusOrder: string[];
  /** 表示・読み上げ用の一文。 */
  message: string;
}

/**
 * 合格逆算の日次計画を立てる。
 * - 残り日数が少ない & 弱点科目が多いほど todayTarget を増やす。
 * - データ不足の科目は behind 扱いしない（早合点を避ける）。
 */
export function planExam(input: ExamPlanInput): ExamPlan {
  const { examMs, nowMs, readiness } = input;
  const capacity = input.dailyCapacity ?? 10;
  const daysLeft = daysUntil(examMs, nowMs);

  if (daysLeft <= 0) {
    return {
      daysLeft,
      expired: true,
      behindSubjects: [],
      todayTarget: 0,
      focusOrder: [],
      message:
        daysLeft === 0
          ? "今日が試験日です。落ち着いて、これまでの積み重ねを出し切りましょう。"
          : "試験日が過ぎています。次の目標を設定しましょう。",
    };
  }

  // 判定可能（データ十分）で合格圏未満の科目だけを弱点として扱う。
  const behind = readiness.filter((r) => r.enoughData && !r.onTrack);
  // 弱点の「合格ラインまでの不足量」の合計（正答率の差を積む）。
  const gap = behind.reduce((a, r) => a + Math.max(0, PASS_LINE - r.accuracy), 0);

  // 残り日数で不足を均す。最低でも capacity の20%は維持（習慣の地ならし）。
  // gap(0..科目数) を「必要総問題数」の近似に変換: 1ポイント=20問 とみなす。
  const estimatedRemaining = Math.ceil(gap * 20);
  const paced = Math.ceil(estimatedRemaining / daysLeft);
  const todayTarget = Math.min(capacity, Math.max(Math.ceil(capacity * 0.2), paced));

  // 弱点が大きい順（不足が大きい＝正答率が低い科目を先に）。
  const focusOrder = [...behind].sort((a, b) => a.accuracy - b.accuracy).map((r) => r.subject);

  const behindSubjects = behind.map((r) => r.subject);
  const focusText =
    focusOrder.length > 0 ? `重点は「${focusOrder.slice(0, 2).join("、")}」。` : "全科目が合格圏。範囲を広げて盤石に。";
  const message = `試験まであと${daysLeft}日。今日の目標は${todayTarget}問。${focusText}`;

  return { daysLeft, expired: false, behindSubjects, todayTarget, focusOrder, message };
}
