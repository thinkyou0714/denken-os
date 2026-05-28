import {
  fsrs,
  generatorParameters,
  createEmptyCard,
  Rating,
  State,
  type Card,
  type Grade,
} from "ts-fsrs";

/** UI に出す 4 段階評価。FSRS の Rating にマッピングする。 */
export type Grade4 = "again" | "hard" | "good" | "easy";

const RATING_MAP: Record<Grade4, Grade> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
};

export const GRADE_LABELS: Record<Grade4, string> = {
  again: "もう一度",
  hard: "難しかった",
  good: "できた",
  easy: "簡単だった",
};

// 既定パラメータは大規模データ由来で初日から妥当に動作する(FSRS-5)。
const scheduler = fsrs(
  generatorParameters({ enable_fuzz: true, maximum_interval: 36500 }),
);

export function newCard(now: Date = new Date()): Card {
  return createEmptyCard(now);
}

export interface ReviewResult {
  card: Card;
}

/** 1 回の復習結果からカードの次回スケジュールを計算する。 */
export function review(card: Card, grade: Grade4, now: Date = new Date()): ReviewResult {
  const item = scheduler.next(card, now, RATING_MAP[grade]);
  return { card: item.card };
}

/** 現時点での記憶保持率 R(0〜1)。未学習カードは 0 とみなす。 */
export function retrievability(card: Card, now: Date = new Date()): number {
  if (card.state === State.New) return 0;
  return scheduler.get_retrievability(card, now, false) as number;
}

/** 復習期限が到来しているか(未学習カードは常に対象)。 */
export function isDue(card: Card | null, now: Date = new Date()): boolean {
  if (!card) return true;
  return new Date(card.due).getTime() <= now.getTime();
}

/** Card は Date を含むため、永続化用に復元する。 */
export function reviveCard(raw: Record<string, unknown>): Card {
  return {
    ...raw,
    due: new Date(raw.due as string),
    last_review:
      raw.last_review != null ? new Date(raw.last_review as string) : undefined,
  } as Card;
}

export interface GradePreview {
  dueAt: Date;
  intervalLabel: string;
}

/**
 * 4 段階それぞれを選んだ場合の次回出題日プレビュー。
 * 評価前にユーザに「もう一度=10分後 / できた=3日後」等を提示するために使う。
 */
export function preview(
  card: Card,
  now: Date = new Date(),
): Record<Grade4, GradePreview> {
  const log = scheduler.repeat(card, now);
  const out = {} as Record<Grade4, GradePreview>;
  (Object.keys(RATING_MAP) as Grade4[]).forEach((g) => {
    const item = log[RATING_MAP[g]];
    const due = new Date(item.card.due);
    out[g] = { dueAt: due, intervalLabel: formatInterval(now, due) };
  });
  return out;
}

function formatInterval(from: Date, to: Date): string {
  const ms = to.getTime() - from.getTime();
  if (ms <= 0) return "今すぐ";
  const minutes = ms / 60_000;
  if (minutes < 60) return `${Math.max(1, Math.round(minutes))}分後`;
  const hours = minutes / 60;
  if (hours < 24) return `${Math.round(hours)}時間後`;
  const days = hours / 24;
  if (days < 30) return `${Math.round(days)}日後`;
  const months = days / 30;
  if (months < 12) return `${Math.round(months)}か月後`;
  return `${Math.round(days / 365)}年後`;
}
