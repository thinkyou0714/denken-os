/**
 * weekly-review.ts — KPI週次レビュー下書き生成（07-analytics-weekly-review）。
 * 追う指標は3つだけ: 保存数 / リプ往復 / フォロー転換（バニティ指標は出さない）。
 * 小規模ノイズ対策に4週移動平均。判断（削る/増やす）は提案に留め自動実行しない。
 */

export interface WeeklyMetrics {
  weekLabel: string; // 例 "2026-W22"
  saves: number;
  replyThreads: number; // リプ往復の数
  followConversions: number;
}

export interface PostMetric {
  id: string;
  saves: number;
  replyThreads: number;
  followConversions: number;
}

function movingAverage(values: number[], window = 4): number {
  if (values.length === 0) return 0;
  const slice = values.slice(-window);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

export interface WeeklyReviewInput {
  /** 直近週を末尾に並べた履歴（移動平均に使う）。 */
  history: WeeklyMetrics[];
  /** 今週の投稿別メトリクス。 */
  posts: PostMetric[];
}

/** 週次レビューの markdown 下書きを生成する（数値入り・重点欄は空欄=人間が埋める）。 */
export function renderWeeklyReview(input: WeeklyReviewInput): string {
  const { history, posts } = input;
  const latest = history[history.length - 1];
  if (!latest) return "# 週次レビュー\n\n（データなし）\n";

  const savesMA = movingAverage(history.map((h) => h.saves));
  const repliesMA = movingAverage(history.map((h) => h.replyThreads));
  const followMA = movingAverage(history.map((h) => h.followConversions));

  const score = (p: PostMetric) => p.saves + p.replyThreads * 2 + p.followConversions * 3;
  const ranked = [...posts].sort((a, b) => score(b) - score(a));
  const top = ranked.slice(0, 3);
  // TOP に出した投稿は flop に出さない（投稿数が少ないと同じ投稿が両方に並ぶ重複を防ぐ）。
  const flop = ranked.slice(3).slice(-3);

  const lines: string[] = [];
  lines.push(`# 週次レビュー（${latest.weekLabel}）`);
  lines.push("");
  lines.push("> 追う指標は3つだけ（保存 / リプ往復 / フォロー転換）。バニティ指標は主KPIに出さない。");
  lines.push("");
  lines.push("## KPI（今週 / 4週移動平均）");
  lines.push("| 指標 | 今週 | 4週移動平均 |");
  lines.push("|---|---|---|");
  lines.push(`| 保存数 | ${latest.saves} | ${savesMA.toFixed(1)} |`);
  lines.push(`| リプ往復 | ${latest.replyThreads} | ${repliesMA.toFixed(1)} |`);
  lines.push(`| フォロー転換 | ${latest.followConversions} | ${followMA.toFixed(1)} |`);
  lines.push("");
  lines.push("## 当たった投稿 TOP3");
  for (const p of top) {
    lines.push(`- ${p.id}（保存${p.saves} / リプ${p.replyThreads} / フォロー${p.followConversions}）`);
  }
  lines.push("");
  lines.push("## 伸びなかった投稿");
  if (flop.length === 0) {
    lines.push("- （投稿数が少なく対象なし）");
  }
  for (const p of flop) {
    lines.push(`- ${p.id}（保存${p.saves} / リプ${p.replyThreads} / フォロー${p.followConversions}）`);
  }
  lines.push("");
  lines.push("## 来週の重点（1つだけ・人間が記入）");
  lines.push("- [ ] ");
  lines.push("");
  lines.push("> 「削る/増やす」の判断は人間が行う（このレビューは提案と素材の提示まで）。");
  lines.push("");
  return lines.join("\n");
}
