/**
 * lib/bridge/links.ts — 教材アフィリエイトの検索結果リンク生成（純ロジック）。
 *
 * ASIN/商品ID の直リンクは参考書の改訂・絶版で陳腐化するため、
 * 「書名の検索結果リンク」を既定形式にしてリンク切れ運用を構造的に回避する（17-A4）。
 * タグ未設定（空文字）ならタグなしの素の検索リンクを返す＝アフィリエイトではなくなる。
 * 表示側はタグ有無で開示バッジ（ステマ規制対応）を切り替えること。
 */

/** Amazon.co.jp の検索結果 URL。tag が空ならアソシエイトタグを付けない。 */
export function amazonSearchUrl(keyword: string, tag: string): string {
  const u = new URL("https://www.amazon.co.jp/s");
  u.searchParams.set("k", keyword);
  if (tag !== "") u.searchParams.set("tag", tag);
  return u.toString();
}

/** 楽天ブックスの検索結果 URL（素のリンク。楽天アフィリはリンク単位発行のため URL 上書きで対応）。 */
export function rakutenSearchUrl(keyword: string): string {
  const u = new URL("https://search.rakuten.co.jp/search/mall/");
  // 楽天はパスセグメントにキーワードを置く形式。
  u.pathname = `/search/mall/${encodeURIComponent(keyword)}/`;
  return u.toString();
}
