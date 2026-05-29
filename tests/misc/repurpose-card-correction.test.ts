import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { classifyReply, draftCorrectionReply, flagCorrections } from "../../lib/correction/classify.js";
import type { Problem } from "../../lib/engine/schema.js";
import { repurpose } from "../../lib/crosspost/repurpose.js";
import { cardText, hasPii } from "../../lib/share-card/card-text.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const T0001: Problem = JSON.parse(
  readFileSync(join(__dirname, "../../data/problems/T-0001.json"), "utf8"),
);

describe("crosspost.repurpose", () => {
  it("媒体別に異なる形式の下書きを出す（丸コピーでない）", () => {
    const d = repurpose(T0001);
    expect(d.note).toContain("# 今日の一問解説");
    expect(Array.isArray(d.instagram)).toBe(true);
    expect(d.instagram.length).toBeGreaterThan(1);
    expect(d.shorts).toContain("[0-5s]");
    expect(d.note).not.toBe(d.shorts);
  });
});

describe("share-card.cardText", () => {
  it("3種類のカードテキストを生成しブランドタグを含む", () => {
    expect(cardText("streak", { streakDays: 30, todayMinutes: 60, weeklyMinutes: 300 })).toContain("#今日のDENKEN");
    expect(cardText("daily", { streakDays: 1, todayMinutes: 45, weeklyMinutes: 45, correctRate: 0.8 })).toContain("80%");
    expect(cardText("weekly", { streakDays: 7, todayMinutes: 30, weeklyMinutes: 210 })).toContain("今週");
  });

  it("URL を含めない / PII 検出が効く", () => {
    expect(() => cardText("streak", { nickname: "see http://x.com", streakDays: 1, todayMinutes: 1, weeklyMinutes: 1 })).toThrow();
    expect(hasPii("連絡は a@b.com まで")).toBe(true);
    expect(hasPii("学習30分")).toBe(false);
  });
});

describe("correction.classify", () => {
  it("誤り指摘らしいリプを検知する", () => {
    const f = classifyReply({ id: "r1", authorHandle: "@u", text: "これ間違いでは？ 正しくは9.6kWだと思います" });
    expect(f.isLikelyCorrection).toBe(true);
  });

  it("通常の応援リプは誤り指摘としない", () => {
    const f = classifyReply({ id: "r2", authorHandle: "@u", text: "むずかしい！がんばります💪" });
    expect(f.isLikelyCorrection).toBe(false);
  });

  it("flagCorrections は候補のみ返す / 訂正下書きに指摘者クレジットがある", () => {
    const flags = flagCorrections([
      { id: "r1", authorHandle: "@a", text: "答えが違う気がします、正しくは3.2では" },
      { id: "r2", authorHandle: "@b", text: "なるほど勉強になります" },
    ]);
    expect(flags.length).toBe(1);
    const draft = draftCorrectionReply({ problemId: "T-0009", reporterHandle: "@a", correctAnswer: "3.2" });
    expect(draft).toContain("@a");
    expect(draft).toContain("削除せず");
  });
});
