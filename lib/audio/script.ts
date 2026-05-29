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

  segments.push({ kind: "answer", text: `正解は、${toSpeech(p.answer)}、です。`, pauseMsAfter: 500 });

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

export interface PlaylistOptions {
  /** この科目だけに絞る（例: ["法規"]）。未指定なら全科目。 */
  subjects?: Subject[];
  /** 先頭に寄せる弱点 topic（この順序を優先）。 */
  weakTopics?: string[];
  /** 残りをシャッフルするか。 */
  shuffle?: boolean;
  rng?: () => number;
}

/**
 * 聞き流しの再生順を組む。
 * 科目フィルタ → 弱点 topic を前方に寄せる → 残りを（任意で）シャッフル。
 */
export function buildPlaylist(problems: Problem[], opts: PlaylistOptions = {}): Problem[] {
  const rng = opts.rng ?? Math.random;
  let pool = problems;
  if (opts.subjects && opts.subjects.length > 0) {
    const set = new Set(opts.subjects);
    pool = pool.filter((p) => set.has(p.subject));
  }

  const weak = opts.weakTopics ?? [];
  const weakSet = new Set(weak);
  const weakItems = pool.filter((p) => weakSet.has(p.topic));
  const rest = pool.filter((p) => !weakSet.has(p.topic));

  // 弱点 topic は weakTopics の順序を保って前方へ。
  weakItems.sort((a, b) => weak.indexOf(a.topic) - weak.indexOf(b.topic));

  if (opts.shuffle) {
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [rest[i], rest[j]] = [rest[j]!, rest[i]!];
    }
  }

  return [...weakItems, ...rest];
}
