import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { Problem } from "../../lib/engine/schema.js";
import { buildXPosts, containsUrl, jitteredTime, scheduleFor } from "../../lib/engine/toXPost.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const T0001: Problem = JSON.parse(
  readFileSync(join(__dirname, "../../data/problems/T-0001.json"), "utf8"),
);

function rngFromSeq(seq: number[]): () => number {
  let i = 0;
  return () => seq[i++ % seq.length]!;
}

describe("toXPost", () => {
  it("validated 1件から朝/夜の投稿テキストを生成する", () => {
    const posts = buildXPosts(T0001, { rng: rngFromSeq([0]) });
    expect(posts.morning).toContain("今日の一問");
    expect(posts.morning).toContain("3.2"); // 選択肢
    expect(posts.evening).toContain("3.2"); // 正解
  });

  it("出典フッターが必ず付く", () => {
    const posts = buildXPosts(T0001, { rng: rngFromSeq([0]) });
    expect(posts.morning).toContain("出典");
    expect(posts.evening).toContain("出典");
  });

  it("本文に URL を含めない", () => {
    const posts = buildXPosts(T0001, { rng: rngFromSeq([0.3, 0.6]) });
    expect(containsUrl(posts.morning)).toBe(false);
    expect(containsUrl(posts.evening)).toBe(false);
  });

  it("テンプレが複数から選ばれ、毎回同一にならない", () => {
    const a = buildXPosts(T0001, { rng: rngFromSeq([0]) }).morning; // テンプレ0
    const b = buildXPosts(T0001, { rng: rngFromSeq([0.5]) }).morning; // 別テンプレ
    expect(a).not.toBe(b);
  });

  it("夜解答に実測正答率を差し込める", () => {
    const posts = buildXPosts(T0001, { rng: rngFromSeq([0]), correctRate: 0.42 });
    expect(posts.evening).toContain("42%");
  });

  it("予約時刻にジッターが入る（±範囲内）", () => {
    const base = new Date("2026-06-01T07:00:00.000Z");
    const t = jitteredTime(base, 20, () => 1); // 最大 +20分
    expect(t.getTime()).toBe(base.getTime() + 20 * 60_000);
    const sched = scheduleFor(new Date("2026-06-01T00:00:00"), () => 0.5);
    // rng=0.5 → delta=0 → 基準時刻ちょうど
    expect(sched.morning.getHours()).toBe(7);
    expect(sched.evening.getHours()).toBe(21);
  });
});
