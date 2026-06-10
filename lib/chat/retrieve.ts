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

/** 1エントリのスコア（0..1）。用語一致 0.7 + 本文類似 0.3 の重み付き和。 */
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
  /** 採用する最小スコア（既定0.18）。下回るヒットは捨てる＝範囲外の正直な検出。 */
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
