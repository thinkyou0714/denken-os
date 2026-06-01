/**
 * xlength.ts — X(旧Twitter)の「重み付き文字数」とスレッド分割。
 *
 * 調査反映: 無料アカウントの上限は 280。ただし日本語/中国語/韓国語・多くの絵文字は
 * **1文字=2カウント**（twitter-text の重み付け）。ASCII等は1。日本語の出題はすぐ超過するため、
 * 朝/夜の投稿はスレッド（複数ポスト）に分割する。スレッドはX文化に馴染み、各ポストに
 * いいね/保存が付きスキャンしやすい（=エンゲージにも有利）。
 *
 * 参考: twitter-text config v3（既定重み200, 軽量レンジ100, scale100, 上限280）。
 */

export const X_MAX_WEIGHTED = 280;

/** 軽量(1カウント)レンジ。これ以外の符号位置は2カウント。 */
function isLightCodePoint(cp: number): boolean {
  if (cp <= 0x10ff) return true; // ASCII〜ラテン拡張等
  if (cp >= 8192 && cp <= 8205) return true; // 一般句読点の一部
  if (cp >= 8208 && cp <= 8223) return true;
  if (cp >= 8242 && cp <= 8247) return true;
  return false; // かな・漢字・全角・絵文字 など → 2カウント
}

/** X の重み付き文字数を返す（CJK/絵文字=2, それ以外=1）。 */
export function xWeightedLength(text: string): number {
  let total = 0;
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    total += isLightCodePoint(cp) ? 1 : 2;
  }
  return total;
}

/** 上限内に収まっているか。 */
export function fitsInPost(text: string, limit = X_MAX_WEIGHTED): boolean {
  return xWeightedLength(text) <= limit;
}

/** 重み付き長で先頭から limit までを切り出す（コードポイント境界を保つ）。 */
function sliceWeighted(text: string, limit: number): { head: string; rest: string } {
  let acc = 0;
  let head = "";
  const chars = [...text];
  let i = 0;
  for (; i < chars.length; i++) {
    const w = isLightCodePoint(chars[i]!.codePointAt(0)!) ? 1 : 2;
    if (acc + w > limit) break;
    acc += w;
    head += chars[i];
  }
  return { head, rest: chars.slice(i).join("") };
}

/**
 * テキストを ≤limit のスレッドに分割する。
 * - まず空行/改行境界で貪欲にまとめ、収まらない行はさらに分割。
 * - 各ポスト末尾に "(i/n)" を付ける（その分の余白を確保）。
 */
export function splitIntoThread(text: string, limit = X_MAX_WEIGHTED): string[] {
  const SUFFIX_BUDGET = 8; // " (10/10)" 程度を見込む
  const room = limit - SUFFIX_BUDGET;

  // 段落（空行区切り）→ 行 の順で詰める。
  const blocks = text.split(/\n/);
  const chunks: string[] = [];
  let cur = "";

  const flush = () => {
    if (cur.length > 0) {
      chunks.push(cur);
      cur = "";
    }
  };

  for (const block of blocks) {
    const candidate = cur.length === 0 ? block : `${cur}\n${block}`;
    if (xWeightedLength(candidate) <= room) {
      cur = candidate;
      continue;
    }
    flush();
    if (xWeightedLength(block) <= room) {
      cur = block;
    } else {
      // 1行が長すぎる場合は重み付きでハード分割。
      let rest = block;
      while (xWeightedLength(rest) > room) {
        const { head, rest: r } = sliceWeighted(rest, room);
        chunks.push(head);
        rest = r;
      }
      cur = rest;
    }
  }
  flush();

  // 1ポストで収まるなら連番を付けない。
  if (chunks.length <= 1) return chunks.length === 1 ? chunks : [text];

  const n = chunks.length;
  return chunks.map((c, i) => `${c} (${i + 1}/${n})`);
}
