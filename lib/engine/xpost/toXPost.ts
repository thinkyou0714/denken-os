/**
 * toXPost.ts — validated 問題 → 「朝出題 / 夜解答」の投稿テキスト（02-xpost-scheduler）。
 *
 * 純関数のみ。実投稿はしない（X API はインターフェース化、既定は下書きエクスポート）。
 * - 文面テンプレを複数持ち、ランダムに回す（毎回同一にならない＝凍結回避）。
 * - 出典フッターを必ず付与（04-compliance）。
 * - 本文に URL を入れない（リンクはリプ/プロフ＝05-engagement）。
 * - 予約時刻にジッターを入れる（±分）。
 */
import type { Problem } from "../schema.js";
import { splitIntoThread, xWeightedLength } from "./xlength.js";

const URL_RE = /(https?:\/\/|www\.)\S+/i;

/** 本文に URL が含まれていないか。 */
export function containsUrl(text: string): boolean {
  return URL_RE.test(text);
}

function stars(difficulty: number): string {
  return "★".repeat(difficulty) + "☆".repeat(Math.max(0, 5 - difficulty));
}

function examLabel(p: Problem): string {
  switch (p.exam) {
    case "denken2_primary":
      return "二種一次";
    case "denken2_secondary":
      return "二種二次";
    case "denken3":
      return "三種";
    default:
      return "電験";
  }
}

/** 出典フッター（original / 改題で出し分け）。 */
export function sourceFooter(p: Problem): string {
  if (p.source.type === "original") {
    return `（出典: ${p.source.citation ?? "DENKEN-OS オリジナル問題"}）`;
  }
  return `（出典: ${p.source.citation}）`;
}

const CHOICE_MARKS = ["①", "②", "③", "④", "⑤", "⑥"];

function choicesLine(p: Problem): string {
  if (!p.choices || p.choices.length === 0) {
    return "答えを計算してリプで👇"; // numeric: 選択肢なし
  }
  return p.choices.map((c, i) => `${CHOICE_MARKS[i] ?? `(${i + 1})`} ${c}`).join("  ");
}

/**
 * 朝出題に併設する X アンケート(poll)。03 の正答率集計の一次ソース。
 * multiple_choice のみ（X poll は最大4択）。numeric は poll なし。
 */
export function morningPoll(
  p: Problem,
  durationMinutes = 12 * 60,
): { options: string[]; durationMinutes: number } | null {
  if (p.format !== "multiple_choice" || !p.choices) return null;
  const options = p.choices.slice(0, 4); // X poll は最大4択
  if (options.length < 2) return null;
  return { options, durationMinutes };
}

// 朝出題テンプレ（複数）。{N} 等は埋め込み。
const MORNING_TEMPLATES = [
  (p: Problem) =>
    `【今日の一問】難易度 ${stars(p.difficulty)}（${examLabel(p)}・${p.subject}）\n\n` +
    `${p.statement}\n\n${choicesLine(p)}\n` +
    `リプで番号を👇 解答＆解説は今夜21時に。\n#電験二種 #今日の一問\n${sourceFooter(p)}`,
  (p: Problem) =>
    `朝の腕試し💡 ${stars(p.difficulty)}（${examLabel(p)}・${p.subject}）\n\n` +
    `${p.statement}\n\n${choicesLine(p)}\n` +
    `番号でリプしてね。夜に答え合わせします。\n#今日の一問 #電験二種\n${sourceFooter(p)}`,
  (p: Problem) =>
    `＼${p.topic}／ いけるか？ ${stars(p.difficulty)}\n\n` +
    `${p.statement}\n\n${choicesLine(p)}\n` +
    `直感でOK、リプで回答を。解説は夜に。\n#電験二種 #今日の一問\n${sourceFooter(p)}`,
];

const EVENING_TEMPLATES = [
  (p: Problem, rate?: number) =>
    `【解答】さっきの一問、正解は「${p.answer}」でした。\n` +
    (rate !== undefined ? `みんなの正答率は ${Math.round(rate * 100)}%。\n` : "") +
    `\n${p.solution.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n\n` +
    `明日もまた一問出します。\n#電験二種 #今日の一問\n${sourceFooter(p)}`,
  (p: Problem, rate?: number) =>
    `答え合わせ✅ 正解は「${p.answer}」。\n` +
    (rate !== undefined ? `正答率 ${Math.round(rate * 100)}%でした。\n` : "") +
    `\n${p.solution.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n\n` +
    `次の一問もお楽しみに。\n#今日の一問 #電験二種\n${sourceFooter(p)}`,
];

function pick<T>(arr: ReadonlyArray<T>, rng: () => number): T {
  // 呼び出し元では常に非空配列を渡しているため index は有効。
  return arr[Math.floor(rng() * arr.length)] as T;
}

export interface XPosts {
  /** 朝出題スレッド（各要素が1ポスト, X重み付き280以内）。 */
  morning: string[];
  /** 夜解答スレッド。 */
  evening: string[];
}

export interface BuildXPostsOptions {
  rng?: () => number;
  /** 夜解答に差し込む実測正答率（03-answer-aggregator 由来）。 */
  correctRate?: number;
}

/**
 * 1件の validated 問題から朝/夜の投稿スレッドを生成する。
 * 日本語は1文字=2カウントで容易に280を超えるため、必ずスレッド分割する。
 */
export function buildXPosts(p: Problem, opts: BuildXPostsOptions = {}): XPosts {
  const rng = opts.rng ?? Math.random;
  const morningText = pick(MORNING_TEMPLATES, rng)(p);
  const eveningText = pick(EVENING_TEMPLATES, rng)(p, opts.correctRate);
  if (containsUrl(morningText) || containsUrl(eveningText)) {
    throw new Error("投稿本文に URL が含まれています（リンクはリプ/プロフへ）");
  }
  const morning = splitIntoThread(morningText);
  const evening = splitIntoThread(eveningText);
  // 不変条件: 全ポストが X の重み付き上限に収まる。
  for (const post of [...morning, ...evening]) {
    if (xWeightedLength(post) > 280) {
      throw new Error(`投稿が X の重み付き280字を超えています: ${xWeightedLength(post)}`);
    }
  }
  return { morning, evening };
}

/** 基準時刻に ±spreadMinutes のジッターを加えた予約時刻を返す。 */
export function jitteredTime(base: Date, spreadMinutes: number, rng: () => number = Math.random): Date {
  const delta = Math.round((rng() * 2 - 1) * spreadMinutes); // [-spread, +spread]
  return new Date(base.getTime() + delta * 60_000);
}

export interface Schedule {
  morning: Date;
  evening: Date;
}

/**
 * 受験者の活動帯（朝7時台 / 夜21時台）にジッター付きで予約時刻を組む。
 * @param day 対象日（時刻部分は無視）
 */
export function scheduleFor(day: Date, rng: () => number = Math.random, spreadMinutes = 20): Schedule {
  const morningBase = new Date(day);
  morningBase.setHours(7, 0, 0, 0);
  const eveningBase = new Date(day);
  eveningBase.setHours(21, 0, 0, 0);
  return {
    morning: jitteredTime(morningBase, spreadMinutes, rng),
    evening: jitteredTime(eveningBase, spreadMinutes, rng),
  };
}
