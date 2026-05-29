/**
 * lesson.ts — 「聞く→解く→弱点ループ」レッスンの純ロジック（DOM 非依存・テスト可能）。
 *
 * 学習科学の定石を素直に実装する:
 *  - インプット（聞き流し）の直後にアウトプット（想起テスト）を置く＝テスト効果。
 *  - 「聞いた論点をそのまま出題」して、聞きっぱなしを想起に変える。
 *  - 結果を弱点に還元し、次レッスンの対象へループさせる（間隔反復と接続）。
 *
 * 合格ロジック（電験）:
 *  - 各科目は概ね 60% で合格。正答率を 0.6 ラインと比較して到達度を出す。
 *  - 科目合格制（一度合格した科目は数年保留）を前提に、弱点科目へ資源を寄せる。
 */
import { buildPlaylist, type PlaylistOptions } from "../audio/script.js";
import type { Problem, Subject } from "../engine/schema.js";

/** 電験の科目合格ライン（満点比）。各種試験で概ね6割。 */
export const PASS_LINE = 0.6;

export interface LessonOptions {
  /** 1レッスンで扱う問題数（聞く＝解く の対象数）。既定5。 */
  count?: number;
  /** 科目で絞る（例: ["法規"]）。 */
  subjects?: Subject[];
  /** 弱点 topic（前方優先・SM-2 由来）。 */
  weakTopics?: string[];
  /** 復習対象（期日到来）に絞る場合。 */
  dueTopics?: string[];
  dueOnly?: boolean;
  rng?: () => number;
}

export interface Lesson {
  /** 聞き流しフェーズの順序（インプット）。 */
  listen: Problem[];
  /** 想起テストフェーズの順序（アウトプット＝listen と同集合を別順序で）。 */
  quiz: Problem[];
}

/**
 * レッスンを組む。聞いた問題をそのまま（順序だけ変えて）出題し、
 * 「聞く→解く」を一巡で完結させる。
 */
export function buildLesson(problems: Problem[], opts: LessonOptions = {}): Lesson {
  const count = opts.count ?? 5;
  const rng = opts.rng ?? Math.random;

  const playlistOpts: PlaylistOptions = {
    subjects: opts.subjects,
    weakTopics: opts.weakTopics,
    dueTopics: opts.dueTopics,
    dueOnly: opts.dueOnly,
    interleave: true,
    limit: count,
  };
  const listen = buildPlaylist(problems, playlistOpts);

  // quiz は listen と同じ集合を別順序に（直後再認でなく軽い遅延＝想起負荷）。
  const quiz = [...listen];
  for (let i = quiz.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [quiz[i], quiz[j]] = [quiz[j]!, quiz[i]!];
  }
  return { listen, quiz };
}

export interface QuizResult {
  topic: string;
  subject: Subject;
  correct: boolean;
}

export interface TopicScore {
  topic: string;
  subject: Subject;
  attempts: number;
  correct: number;
  accuracy: number;
}

export interface LessonSummary {
  total: number;
  correct: number;
  /** 全体正答率（0..1）。 */
  accuracy: number;
  /** 合格ライン(0.6)に到達したか。 */
  reachedPassLine: boolean;
  /** 合格ラインまであと何問正解が必要か（不足分。到達済みは0）。 */
  toPass: number;
  /** topic 別スコア（正答率の低い順）。 */
  byTopic: TopicScore[];
  /** 科目別正答率（弱点科目の特定）。 */
  bySubject: Array<{ subject: Subject; accuracy: number; attempts: number }>;
  /** 次に重点化すべき弱点 topic（低正答率順, 最大3）。 */
  weakestTopics: string[];
}

/** レッスンの解答結果を集計し、合格ラインと弱点を出す。 */
export function summarizeLesson(results: QuizResult[]): LessonSummary {
  const total = results.length;
  const correct = results.filter((r) => r.correct).length;
  const accuracy = total > 0 ? correct / total : 0;
  const need = Math.ceil(PASS_LINE * total);
  const toPass = Math.max(0, need - correct);

  const topicMap = new Map<string, TopicScore>();
  for (const r of results) {
    const cur = topicMap.get(r.topic) ?? { topic: r.topic, subject: r.subject, attempts: 0, correct: 0, accuracy: 0 };
    cur.attempts += 1;
    if (r.correct) cur.correct += 1;
    cur.accuracy = cur.correct / cur.attempts;
    topicMap.set(r.topic, cur);
  }
  const byTopic = [...topicMap.values()].sort((a, b) => a.accuracy - b.accuracy);

  const subjMap = new Map<Subject, { subject: Subject; correct: number; attempts: number }>();
  for (const r of results) {
    const cur = subjMap.get(r.subject) ?? { subject: r.subject, correct: 0, attempts: 0 };
    cur.attempts += 1;
    if (r.correct) cur.correct += 1;
    subjMap.set(r.subject, cur);
  }
  const bySubject = [...subjMap.values()]
    .map((s) => ({ subject: s.subject, accuracy: s.attempts > 0 ? s.correct / s.attempts : 0, attempts: s.attempts }))
    .sort((a, b) => a.accuracy - b.accuracy);

  const weakestTopics = byTopic
    .filter((t) => t.accuracy < PASS_LINE)
    .slice(0, 3)
    .map((t) => t.topic);

  return {
    total,
    correct,
    accuracy,
    reachedPassLine: accuracy >= PASS_LINE,
    toPass,
    byTopic,
    bySubject,
    weakestTopics,
  };
}

/** レッスン結果の講評＋次アクション提案（読み上げ/表示用の自然文）。 */
export function lessonFeedback(summary: LessonSummary): string {
  if (summary.total === 0) return "出題できる問題がありませんでした。";
  const pct = Math.round(summary.accuracy * 100);
  const head = `${summary.total}問中${summary.correct}問正解（正答率${pct}%）。`;
  if (summary.reachedPassLine) {
    if (summary.weakestTopics.length > 0) {
      return `${head}合格ライン60%を超えています。取りこぼした「${summary.weakestTopics.join("、")}」を復習に回すと盤石です。`;
    }
    return `${head}合格ライン60%を超えています。この調子で範囲を広げましょう。`;
  }
  const focus = summary.weakestTopics.length > 0 ? `特に「${summary.weakestTopics.join("、")}」が弱点です。` : "";
  return `${head}合格ライン60%まであと${summary.toPass}問。${focus}弱点モードで重点復習しましょう。`;
}

export interface PassReadiness<S = Subject> {
  subject: S;
  accuracy: number;
  attempts: number;
  /** 合格圏(>=60%)か。 */
  onTrack: boolean;
  /** データが十分か（試行が少ないと判定保留）。 */
  enoughData: boolean;
}

/**
 * 科目別の合格到達度（蓄積された解答ログ集計から）。
 * attempts が minAttempts 未満は「データ不足」で判定を保留する。
 * subject 型は呼び出し側に合わせて推論する（永続ログの string でもそのまま使える）。
 */
export function passReadiness<S = Subject>(
  bySubject: Array<{ subject: S; accuracy: number; attempts: number }>,
  minAttempts = 5,
): PassReadiness<S>[] {
  return bySubject.map((s) => ({
    subject: s.subject,
    accuracy: s.accuracy,
    attempts: s.attempts,
    onTrack: s.accuracy >= PASS_LINE,
    enoughData: s.attempts >= minAttempts,
  }));
}
