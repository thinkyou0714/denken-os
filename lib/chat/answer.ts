/**
 * answer.ts — ローカル（オフライン）回答の合成（純ロジック）。
 *
 * APIキーが無くても「電験の質問に答えるチャット」を成立させる既定モード。
 * 回答は curated ナレッジの引用のみで構成する＝ハルシネーションが構造的に起きない。
 * ヒットしない質問には知ったかぶりをせず、できること・近いトピックを正直に案内する
 * （根本対策: 「わからない」を言えない設計が誤答の温床になるため）。
 */
import { findEntry, KNOWLEDGE } from "./knowledge.js";
import { retrieve } from "./retrieve.js";
import type { ChatCategory, KnowledgeEntry, RetrievalHit } from "./types.js";

/** 最初に提示するおすすめ質問（空履歴時のチップ）。 */
export const SUGGESTED_QUESTIONS: readonly string[] = [
  "%インピーダンスとは？",
  "三種と二種の違いは？",
  "力率改善のコンデンサ容量の公式は？",
  "誘導電動機のすべりとは？",
  "接地工事のA種〜D種の違いは？",
  "勉強は何から始めればいい？",
];

/** 法令・制度は改正されるため、該当カテゴリの回答に必ず添える注意書き。 */
export const LEGAL_DISCLAIMER =
  "※法令・試験制度は改正されることがあります。必ず最新の条文・公式発表を確認してください。";

const DATED_CATEGORIES: ReadonlySet<ChatCategory> = new Set(["法規", "制度"]);

export type LocalIntent = "greeting" | "thanks" | "formula" | "lookup";

/** 質問の意図を軽量に分類する（あいさつ/お礼/公式照会/通常検索）。 */
export function detectIntent(query: string): LocalIntent {
  const q = query.trim();
  if (/^(こんにちは|こんばんは|おはよう|はじめまして|やあ|よろしく|hi|hello)/i.test(q)) return "greeting";
  if (/(ありがとう|たすかった|助かった|thanks|thank you)/i.test(q)) return "thanks";
  if (/(公式|数式|式は|式を)/.test(q)) return "formula";
  return "lookup";
}

export interface LocalAnswer {
  /** 表示テキスト（mathfmt の `_` `^` 記法を含み得る）。 */
  text: string;
  /** 根拠にした出典（表示用）。 */
  citations: string[];
  /** 続けて聞けるおすすめ質問。 */
  suggestions: string[];
  /** マッチしたエントリ（API モードのグラウンディングにも流用）。 */
  matched: KnowledgeEntry[];
}

/** エントリ1件を回答テキストに整形する。 */
export function formatEntry(entry: KnowledgeEntry, opts: { leadWithFormula?: boolean } = {}): string {
  const lines: string[] = [`【${entry.term}】（${entry.category}）`];
  if (opts.leadWithFormula && entry.formula) lines.push(`公式: ${entry.formula}`, "");
  lines.push(entry.summary);
  if (entry.points.length > 0) {
    lines.push("", "ポイント:");
    for (const p of entry.points) lines.push(`・${p}`);
  }
  if (!opts.leadWithFormula && entry.formula) lines.push("", `公式: ${entry.formula}`);
  const relatedTerms = entry.related.map((id) => findEntry(id)?.term).filter((t): t is string => Boolean(t));
  if (relatedTerms.length > 0) lines.push("", `関連: ${relatedTerms.join(" / ")}`);
  if (DATED_CATEGORIES.has(entry.category)) lines.push("", LEGAL_DISCLAIMER);
  return lines.join("\n");
}

/** 関連トピックから「次のおすすめ質問」を作る。 */
function suggestionsFor(entry: KnowledgeEntry): string[] {
  return entry.related
    .map((id) => findEntry(id)?.term)
    .filter((t): t is string => Boolean(t))
    .slice(0, 3)
    .map((t) => `${t}とは？`);
}

/** ヒットなし時のフォールバック（正直に限界を伝え、できることを示す）。 */
function fallbackAnswer(): LocalAnswer {
  const text = [
    "ごめんなさい、その質問は内蔵ナレッジ（オフライン）では見つかりませんでした。",
    "",
    "このチャットができること:",
    "・電験の用語・公式・試験制度・勉強法の解説（出典付き）",
    "・設定タブで Anthropic API キーを登録すると、Claude による自由質問への回答に切り替わります",
    "",
    "言い換えると見つかることもあります（例: 「%Z」→「%インピーダンス」）。",
  ].join("\n");
  return { text, citations: [], suggestions: [...SUGGESTED_QUESTIONS.slice(0, 3)], matched: [] };
}

/**
 * ローカル回答を合成する。
 * @param query ユーザーの質問
 * @param kb 検索対象（テスト用に差し替え可）
 */
export function answerLocally(query: string, kb: KnowledgeEntry[] = KNOWLEDGE): LocalAnswer {
  const intent = detectIntent(query);
  if (intent === "greeting") {
    return {
      text: [
        "こんにちは！電験の学習をサポートするチャットです。",
        "用語・公式・試験制度・勉強法など、なんでも聞いてください。",
        "（オフラインでは内蔵ナレッジから出典付きで回答します）",
      ].join("\n"),
      citations: [],
      suggestions: [...SUGGESTED_QUESTIONS.slice(0, 4)],
      matched: [],
    };
  }
  if (intent === "thanks") {
    return {
      text: "どういたしまして！続けて聞きたいことがあればどうぞ。復習タブの消化も忘れずに💪",
      citations: [],
      suggestions: [...SUGGESTED_QUESTIONS.slice(0, 3)],
      matched: [],
    };
  }

  const hits: RetrievalHit[] = retrieve(query, kb);
  if (hits.length === 0) return fallbackAnswer();

  // hits.length === 0 のケースは直前で return 済みのため hits[0] は存在する。
  const top = (hits[0] as (typeof hits)[number]).entry;
  const text = formatEntry(top, { leadWithFormula: intent === "formula" });
  const others = hits.slice(1).map((h) => h.entry.term);
  const extra = others.length > 0 ? `\n\nもしかして: ${others.join(" / ")}` : "";
  return {
    text: text + extra,
    citations: [top.citation],
    suggestions: suggestionsFor(top),
    matched: hits.map((h) => h.entry),
  };
}
