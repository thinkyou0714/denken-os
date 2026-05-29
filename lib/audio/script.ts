/**
 * script.ts — validated 問題 → 「聞き流し」用の音声スクリプト（純関数・決定論）。
 *
 * 法規のような暗記比重の高い科目を、出題→（考える間）→正解→解説 の順に
 * 読み上げるための区切り付き台本を組み立てる。数値の正解はコード算出済みの
 * 値をそのまま読み上げるだけで、新情報は加えない（ハルシネーション対策を維持）。
 */
import type { Exam, Problem, Subject } from "../engine/schema.js";
import { toSpeech } from "./speech-text.js";

export type AudioSegmentKind = "intro" | "question" | "choices" | "gap" | "answer" | "explanation" | "source";

export interface AudioSegment {
  kind: AudioSegmentKind;
  /** 読み上げる正規化済みテキスト。 */
  text: string;
  /** この区間の読み上げ後に置く無音(ミリ秒)。考える間など。 */
  pauseMsAfter: number;
}

export interface AudioScript {
  problemId: string;
  topic: string;
  segments: AudioSegment[];
}

export interface AudioScriptOptions {
  /** 「答えを考える」無音の長さ(ms)。既定6秒。 */
  gapMs?: number;
  /** 解説を読み上げに含めるか（既定 true）。 */
  includeExplanation?: boolean;
  /** 出典を読み上げに含めるか（既定 false。連続再生でうるさいため）。 */
  includeSource?: boolean;
  /** 正解をもう一度読み上げるか（暗記定着。法規の数値に有効。既定 false）。 */
  repeatAnswer?: boolean;
}

const CHOICE_WORDS = ["1ばん", "2ばん", "3ばん", "4ばん", "5ばん", "6ばん"];

function examLabel(exam: Exam | undefined): string {
  switch (exam) {
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

function sourceText(p: Problem): string {
  return p.source.type === "original" ? (p.source.citation ?? "DENKEN-OS オリジナル問題") : (p.source.citation ?? "");
}

/** 1問を聞き流し台本に変換する。 */
export function toAudioScript(p: Problem, opts: AudioScriptOptions = {}): AudioScript {
  const gapMs = opts.gapMs ?? 6000;
  const includeExplanation = opts.includeExplanation ?? true;
  const includeSource = opts.includeSource ?? false;
  const repeatAnswer = opts.repeatAnswer ?? false;

  const segments: AudioSegment[] = [];

  segments.push({
    kind: "intro",
    text: `${examLabel(p.exam)}、${p.subject}、${p.topic}。難易度${p.difficulty}。`,
    pauseMsAfter: 400,
  });

  segments.push({ kind: "question", text: `問題。${toSpeech(p.statement)}`, pauseMsAfter: 500 });

  if (p.choices && p.choices.length > 0) {
    const list = p.choices.map((c, i) => `${CHOICE_WORDS[i] ?? `${i + 1}ばん`}、${toSpeech(c)}`).join("。");
    segments.push({ kind: "choices", text: `選択肢。${list}。`, pauseMsAfter: 300 });
  }

  segments.push({ kind: "gap", text: "では、答えを考えてください。", pauseMsAfter: gapMs });

  const spokenAnswer = toSpeech(p.answer);
  const answerText = repeatAnswer
    ? `正解は、${spokenAnswer}、です。もう一度、${spokenAnswer}。`
    : `正解は、${spokenAnswer}、です。`;
  segments.push({ kind: "answer", text: answerText, pauseMsAfter: 500 });

  if (includeExplanation && p.solution.length > 0) {
    const body = p.solution.map((s) => toSpeech(s)).join("。 ");
    segments.push({ kind: "explanation", text: `解説。${body}`, pauseMsAfter: 600 });
  }

  if (includeSource) {
    const src = sourceText(p);
    if (src) segments.push({ kind: "source", text: `出典、${src}。`, pauseMsAfter: 800 });
  }

  return { problemId: p.id, topic: p.topic, segments };
}

/** 台本を1本のプレーンテキスト原稿にする（書き出し・テスト用）。 */
export function audioScriptToPlainText(script: AudioScript): string {
  return script.segments.map((s) => s.text).join("\n");
}

/**
 * 複数問の読み上げ原稿をまとめたテキスト（アクセシビリティ＝聴覚補助/読み返し、
 * 学習ログの書き出しに使う）。各問は区切り線で分ける。
 */
export function playlistTranscript(problems: Problem[], opts?: AudioScriptOptions): string {
  return problems.map((p) => audioScriptToPlainText(toAudioScript(p, opts))).join("\n\n———\n\n");
}

/**
 * 聞き流しセッションの締め文言（読み上げ用）。
 * 「何問聞いたか」と「重点復習したい論点」を簡潔に伝える（継続のフック）。
 */
export function sessionSummaryText(opts: { count: number; weakTopics?: string[] }): string {
  if (opts.count <= 0) return "再生を終了します。";
  const head = `お疲れさまでした。今回は${opts.count}問を聞きました。`;
  const weak = opts.weakTopics?.slice(0, 3) ?? [];
  const tail = weak.length > 0 ? `特に復習したい論点は、${weak.join("、")} です。` : "";
  return head + tail;
}

export interface PlaylistOptions {
  /** この科目だけに絞る（例: ["法規"]）。未指定なら全科目。 */
  subjects?: Subject[];
  /** 先頭に寄せる弱点 topic（この順序を優先）。 */
  weakTopics?: string[];
  /** 除外する topic。 */
  excludeTopics?: string[];
  /** この難易度(★)だけに絞る。 */
  difficulties?: number[];
  /** 復習期日が到来している topic（SM-2 由来）。dueOnly と併用。 */
  dueTopics?: string[];
  /** dueTopics に含まれる topic だけに絞る（間隔反復の復習セッション）。 */
  dueOnly?: boolean;
  /** 残りをシャッフルするか。 */
  shuffle?: boolean;
  /** 同じ topic が連続しないよう散らす（弱点先頭の後ろ＝rest に適用）。 */
  interleave?: boolean;
  /** 最大件数（セッション長・件数スリープタイマー）。 */
  limit?: number;
  rng?: () => number;
}

/** 同一 topic が連続しないよう、topic バケットのラウンドロビンで並べ替える（順序安定）。 */
function interleaveByTopic(items: Problem[]): Problem[] {
  const buckets = new Map<string, Problem[]>();
  for (const p of items) {
    const b = buckets.get(p.topic) ?? [];
    b.push(p);
    buckets.set(p.topic, b);
  }
  const queues = [...buckets.values()];
  const out: Problem[] = [];
  let remaining = items.length;
  while (remaining > 0) {
    for (const q of queues) {
      const next = q.shift();
      if (next) {
        out.push(next);
        remaining -= 1;
      }
    }
  }
  return out;
}

/**
 * 聞き流しの再生順を組む。
 * 科目フィルタ → 除外 → 弱点 topic を前方へ → 残りをシャッフル/インターリーブ → 件数上限。
 */
export function buildPlaylist(problems: Problem[], opts: PlaylistOptions = {}): Problem[] {
  const rng = opts.rng ?? Math.random;
  let pool = problems;
  if (opts.subjects && opts.subjects.length > 0) {
    const set = new Set(opts.subjects);
    pool = pool.filter((p) => set.has(p.subject));
  }
  if (opts.excludeTopics && opts.excludeTopics.length > 0) {
    const ex = new Set(opts.excludeTopics);
    pool = pool.filter((p) => !ex.has(p.topic));
  }
  if (opts.difficulties && opts.difficulties.length > 0) {
    const d = new Set(opts.difficulties);
    pool = pool.filter((p) => d.has(p.difficulty));
  }
  if (opts.dueOnly) {
    const due = new Set(opts.dueTopics ?? []);
    pool = pool.filter((p) => due.has(p.topic));
  }

  const weak = opts.weakTopics ?? [];
  const weakSet = new Set(weak);
  const weakItems = pool.filter((p) => weakSet.has(p.topic));
  let rest = pool.filter((p) => !weakSet.has(p.topic));

  // 弱点 topic は weakTopics の順序を保って前方へ。
  weakItems.sort((a, b) => weak.indexOf(a.topic) - weak.indexOf(b.topic));

  if (opts.shuffle) {
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [rest[i], rest[j]] = [rest[j]!, rest[i]!];
    }
  }
  if (opts.interleave) rest = interleaveByTopic(rest);

  const ordered = [...weakItems, ...rest];
  return opts.limit && opts.limit > 0 ? ordered.slice(0, opts.limit) : ordered;
}
