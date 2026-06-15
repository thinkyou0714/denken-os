/**
 * retrieve.ts — ナレッジベースの軽量検索（純ロジック・依存なし）。
 *
 * 日本語は分かち書きがないため、文字バイグラム（2-gram）の Dice 係数と
 * 用語・エイリアスの包含一致を組み合わせる。形態素解析や埋め込みは使わず、
 * オフライン（静的PWA）で決定論的に動くことを最優先にする。
 *  - 用語一致（包含）: 長い用語がクエリに含まれるほど高スコア
 *  - 本文類似: summary/points とのバイグラム類似で補完
 */
import { KNOWLEDGE } from "./knowledge.js";
import type { KnowledgeEntry, RetrievalHit } from "./types.js";

/** 検索向け正規化: NFKC → 小文字化 → 空白・約物を除去。 */
export function normalizeQuery(s: string): string {
  return s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s、。・，．,.!?！？「」『』（）()[\]{}〈〉<>:：;；…‥〜~ー\-_/＝=＋+*'"’”`]/gu, "");
}

/** 文字バイグラム集合（1文字なら単文字集合）。 */
export function bigrams(s: string): Set<string> {
  if (s.length <= 1) return new Set(s ? [s] : []);
  const out = new Set<string>();
  for (let i = 0; i < s.length - 1; i++) out.add(s.slice(i, i + 2));
  return out;
}

/** Dice 係数（0..1）。 */
export function dice(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const g of a) if (b.has(g)) inter++;
  return (2 * inter) / (a.size + b.size);
}

/**
 * 1エントリのスコア（0..1）。用語一致 0.7 + 本文類似 0.3 の重み付き和（II-136）。
 *
 * ## 重みの根拠（0.7 : 0.3）
 * - 用語一致（term/aliases との包含・Dice）を **0.7** と高く設定する理由:
 *   電験ナレッジは「キルヒホッフ」「変圧器」のような専門用語で検索されることが多い。
 *   用語が一致した場合はほぼ確実に正しいエントリなので、スコアの主軸に置く。
 * - 本文類似（summary/points の Dice）を **0.3** に抑える理由:
 *   日本語は分かち書きがないため文字バイグラム Dice は誤検出しやすい。
 *   本文全体 Dice は補完的な位置付けに留め、過信しない。
 * - テスト拡充・日本語/カナ/英混在の精度検証は RG7 が担当（II-136）。
 */
export function scoreEntry(queryNorm: string, qGrams: Set<string>, entry: KnowledgeEntry): number {
  let termScore = 0;
  for (const t of [entry.term, ...entry.aliases]) {
    const tn = normalizeQuery(t);
    if (tn.length === 0) continue;
    let s: number;
    if (queryNorm.includes(tn) || tn.includes(queryNorm)) {
      // 包含一致: 一致部分が長いほど確信が高い（短い語の偶然一致を抑える）
      s = Math.min(tn.length, queryNorm.length) / Math.max(tn.length, queryNorm.length);
      s = 0.5 + 0.5 * s; // 包含した時点で下駄を履かせる
    } else {
      s = dice(qGrams, bigrams(tn));
    }
    if (s > termScore) termScore = s;
  }
  const body = normalizeQuery(`${entry.summary}${entry.points.join("")}`);
  const bodyScore = dice(qGrams, bigrams(body));
  return 0.7 * termScore + 0.3 * bodyScore;
}

export interface RetrieveOptions {
  /** 返す最大件数（既定3）。 */
  k?: number;
  /**
   * 採用する最小スコア（既定 0.18）（II-136）。下回るヒットは捨てる＝範囲外の正直な検出。
   *
   * ## minScore=0.18 の根拠
   * - `scoreEntry` の重み付き和スコアの分布を 61エントリで手動検証したところ、
   *   まったく無関係なクエリでも Dice 係数の偶然一致で ~0.05〜0.15 程度が出る。
   *   0.18 はこのノイズ域（~0.15）より上で、かつ「薄い関連がある」ケースを捉える下限。
   * - 0.18 未満は「関連あり」と判断できる根拠が弱いため捨てる（質重視・量より質）。
   * - 日本語/カナ/英混在環境での閾値精度検証テストは RG7 に委ねる（II-136）。
   */
  minScore?: number;
}

/** クエリに関連するナレッジを上位 k 件返す（スコア降順）。 */
export function retrieve(query: string, kb: KnowledgeEntry[] = KNOWLEDGE, opts: RetrieveOptions = {}): RetrievalHit[] {
  const k = opts.k ?? 3;
  const minScore = opts.minScore ?? 0.18;
  const qn = normalizeQuery(query);
  if (qn.length === 0) return [];
  const qGrams = bigrams(qn);
  const hits: RetrievalHit[] = [];
  for (const entry of kb) {
    const score = scoreEntry(qn, qGrams, entry);
    if (score >= minScore) hits.push({ entry, score });
  }
  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, k);
}
