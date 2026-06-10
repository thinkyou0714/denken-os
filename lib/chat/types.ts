/**
 * types.ts — AI質問チャットの共有型（純型定義）。
 *
 * 設計方針（根本原因対策）:
 *  - バックエンド無し（静的PWA）でも成立する2層構成:
 *      ① ローカル知識ベース検索（オフライン・決定論・出典付き） … 既定
 *      ② BYOK（ユーザー自身の Anthropic API キー）で Claude を直接呼ぶ強化モード
 *  - ハルシネーション対策: 回答は必ず検証済みナレッジに接地（グラウンディング）。
 *    ローカル回答は引用のみで構成し、AI回答は検索結果をコンテキスト注入＋出典明示を強制。
 */

/** ナレッジのカテゴリ。試験科目＋制度・学習法の横断カテゴリ。 */
export type ChatCategory = "理論" | "電力" | "機械" | "法規" | "電力管理" | "機械制御" | "制度" | "学習法";

/** 検証済みナレッジの1エントリ（curated・出典必須）。 */
export interface KnowledgeEntry {
  /** 安定ID（related の参照に使う）。 */
  id: string;
  /** 正式な用語・トピック名。 */
  term: string;
  /** 別名・略称・ひらがな表記など検索用エイリアス。 */
  aliases: string[];
  category: ChatCategory;
  /** 2〜3文の要約（結論先行）。 */
  summary: string;
  /** 主要公式（mathfmt の `_` `^` 記法）。 */
  formula?: string;
  /** 覚えるべきポイント（箇条書き）。 */
  points: string[];
  /** 関連エントリの id。 */
  related: string[];
  /** 出典・根拠（法規は条文名を明記）。 */
  citation: string;
}

/** 検索ヒット（スコア付き）。 */
export interface RetrievalHit {
  entry: KnowledgeEntry;
  /** 0..1 のスコア（用語一致 + 本文類似の重み付き和）。 */
  score: number;
}

/** チャットの回答モード。local=内蔵ナレッジ / api=Claude API（BYOK）。 */
export type ChatMode = "local" | "api";

/** チャット1メッセージ（localStorage に永続化）。 */
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  /** assistant のとき: 回答の根拠にした出典。 */
  citations?: string[];
  /** assistant のとき: どのモードで生成したか。 */
  mode?: ChatMode;
  atMs: number;
}
