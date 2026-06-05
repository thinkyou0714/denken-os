import { describe, expect, it } from "vitest";
import { renderWeeklyReview } from "../../lib/analytics/weekly-review.js";

describe("renderWeeklyReview", () => {
  const input = {
    history: [
      { weekLabel: "2026-W19", saves: 10, replyThreads: 5, followConversions: 2 },
      { weekLabel: "2026-W20", saves: 20, replyThreads: 8, followConversions: 3 },
      { weekLabel: "2026-W21", saves: 30, replyThreads: 10, followConversions: 4 },
      { weekLabel: "2026-W22", saves: 40, replyThreads: 12, followConversions: 6 },
    ],
    posts: [
      { id: "T-0007", saves: 25, replyThreads: 8, followConversions: 3 },
      { id: "T-0008", saves: 2, replyThreads: 0, followConversions: 0 },
      { id: "T-0009", saves: 13, replyThreads: 4, followConversions: 3 },
    ],
  };

  it("数値入りのレビューを生成し、4週移動平均を含む", () => {
    const md = renderWeeklyReview(input);
    expect(md).toContain("2026-W22");
    expect(md).toContain("4週移動平均");
    // 保存の移動平均 = (10+20+30+40)/4 = 25.0
    expect(md).toContain("25.0");
  });

  it("バニティ指標（インプレッション/フォロワー総数）を主指標に出さない", () => {
    const md = renderWeeklyReview(input);
    expect(md).not.toContain("インプレッション");
    expect(md).not.toContain("フォロワー数");
  });

  it("当たり投稿TOP3を抽出する", () => {
    const md = renderWeeklyReview(input);
    expect(md).toContain("T-0007"); // 最も伸びた
  });

  it("来週の重点は空欄（人間が記入＝自動判断しない）", () => {
    const md = renderWeeklyReview(input);
    expect(md).toContain("- [ ] ");
  });

  it("投稿数が少ない週は同じ投稿が TOP と FLOP に重複しない", () => {
    const md = renderWeeklyReview(input); // posts は3件
    const flopSection = md.split("## 伸びなかった投稿")[1] ?? "";
    // 3件すべて TOP3 に入るため flop には実投稿IDが出ない（重複回避）。
    expect(flopSection).toContain("対象なし");
    expect(flopSection).not.toContain("T-0007");
  });

  it("履歴が空ならデータなしを返す", () => {
    expect(renderWeeklyReview({ history: [], posts: [] })).toContain("データなし");
  });
});
