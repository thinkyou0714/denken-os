/**
 * repurpose.ts — クロスポスト下書き生成（11-repurpose-crosspost）。
 * 媒体ごとに形式を変える（丸転載しない）。投稿自体はしない＝下書きのみ。
 */
import type { Problem } from "../engine/schema.js";
import { sourceFooter } from "../engine/xpost/toXPost.js";

export interface RepurposeDrafts {
  note: string; // 長文記事
  instagram: string[]; // カルーセル各スライドのテキスト
  shorts: string; // 60秒動画の台本+字幕
}

/** 1問から媒体別の最適化下書きを作る。 */
export function repurpose(p: Problem): RepurposeDrafts {
  const footer = sourceFooter(p);
  const choices = (p.choices ?? []).map((c, i) => `${["①", "②", "③", "④"][i] ?? `(${i + 1})`} ${c}`);

  const note = [
    `# 今日の一問解説: ${p.topic}`,
    "",
    `## 問題`,
    p.statement,
    "",
    choices.join("  "),
    "",
    `## 解答`,
    `正解: **${p.answer}**`,
    "",
    `## 解説`,
    ...p.solution.map((s, i) => `${i + 1}. ${s}`),
    "",
    `## つまずきポイント`,
    `最頻誤答は「${p.stats?.common_wrong_choice ?? "—"}」。ここを落とすと失点しやすい。`,
    "",
    footer,
  ].join("\n");

  const instagram = [
    `${p.topic}\n今日の一問`,
    `${p.statement}`,
    choices.join("\n"),
    `正解: ${p.answer}`,
    ...p.solution.map((s) => s),
    `保存して後で解いてね\n${footer}`,
  ];

  const shorts = [
    `[0-5s] 今日の一問。${p.topic}、いける？`,
    `[5-20s] ${p.statement}`,
    `[20-30s] 選択肢: ${choices.join(" / ")}`,
    `[30-55s] 解説: ${p.solution.join(" → ")}`,
    `[55-60s] 正解は ${p.answer}。チャンネル登録で毎日一問！`,
    footer,
  ].join("\n");

  return { note, instagram, shorts };
}
