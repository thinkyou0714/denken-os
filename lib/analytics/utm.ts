/**
 * utm.ts — 流入計測用 UTM 付きリンク生成（07-analytics-weekly-review）。
 * 「どの投稿がアプリ流入を生んだか」を UTM/専用URLで計測する。
 * 注意: 生成した URL は X 本文には貼らない（リンクはプロフ/リプ＝05-engagement）。
 *       プロフリンクやリプに使う想定。
 */

export interface UtmParams {
  source: string; // 例 "x"
  medium: string; // 例 "social" / "profile" / "reply"
  campaign: string; // 例 "today-quiz"
  content?: string; // 例 問題ID "T-0127"
  term?: string;
}

/** base URL に UTM パラメータを付与する（既存クエリは保持）。 */
export function withUtm(baseUrl: string, p: UtmParams): string {
  const u = new URL(baseUrl);
  u.searchParams.set("utm_source", p.source);
  u.searchParams.set("utm_medium", p.medium);
  u.searchParams.set("utm_campaign", p.campaign);
  if (p.content) u.searchParams.set("utm_content", p.content);
  if (p.term) u.searchParams.set("utm_term", p.term);
  return u.toString();
}

/** 「今日の一問」投稿用の計測リンク（問題IDを content に）。 */
export function quizLink(baseUrl: string, problemId: string, medium = "profile"): string {
  return withUtm(baseUrl, { source: "x", medium, campaign: "today-quiz", content: problemId });
}

/** UTM パラメータを解析して集計キーに使う（07 の流入突き合わせ）。 */
export function parseUtm(url: string): Partial<UtmParams> & { content?: string } {
  const u = new URL(url);
  const g = (k: string) => u.searchParams.get(k) ?? undefined;
  const result: Partial<UtmParams> & { content?: string } = {};
  const source = g("utm_source");
  const medium = g("utm_medium");
  const campaign = g("utm_campaign");
  const content = g("utm_content");
  const term = g("utm_term");
  if (source !== undefined) result.source = source;
  if (medium !== undefined) result.medium = medium;
  if (campaign !== undefined) result.campaign = campaign;
  if (content !== undefined) result.content = content;
  if (term !== undefined) result.term = term;
  return result;
}
