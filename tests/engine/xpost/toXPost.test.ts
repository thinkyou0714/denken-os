import { describe, expect, it } from "vitest";
import { buildXPosts, containsUrl, jitteredTime, scheduleFor } from "../../../lib/engine/xpost/toXPost.js";
import { xWeightedLength } from "../../../lib/engine/xpost/xlength.js";
import { loadProblemFixture } from "../../helpers/fixtures.js";

const T0001 = loadProblemFixture("T-0001");

function rngFromSeq(seq: number[]): () => number {
  let i = 0;
  return () => seq[i++ % seq.length]!;
}

describe("toXPost", () => {
  it("validated 1件から朝/夜のスレッドを生成する", () => {
    const posts = buildXPosts(T0001, { rng: rngFromSeq([0]) });
    expect(posts.morning.length).toBeGreaterThanOrEqual(1);
    const morningAll = posts.morning.join("\n");
    const eveningAll = posts.evening.join("\n");
    expect(morningAll).toContain("3.2"); // 選択肢
    expect(eveningAll).toContain("3.2"); // 正解
  });

  it("全ポストが X の重み付き280字以内（日本語=2カウント）に収まる", () => {
    const posts = buildXPosts(T0001, { rng: rngFromSeq([0.3, 0.6]) });
    for (const post of [...posts.morning, ...posts.evening]) {
      expect(xWeightedLength(post)).toBeLessThanOrEqual(280);
    }
  });

  it("出典フッターが付く / 本文に URL を含めない", () => {
    const posts = buildXPosts(T0001, { rng: rngFromSeq([0]) });
    expect(posts.morning.join("\n")).toContain("出典");
    for (const post of [...posts.morning, ...posts.evening]) {
      expect(containsUrl(post)).toBe(false);
    }
  });

  it("テンプレが複数から選ばれ、毎回同一にならない", () => {
    const a = buildXPosts(T0001, { rng: rngFromSeq([0]) }).morning.join("\n");
    const b = buildXPosts(T0001, { rng: rngFromSeq([0.5]) }).morning.join("\n");
    expect(a).not.toBe(b);
  });

  it("夜解答に実測正答率を差し込める", () => {
    const posts = buildXPosts(T0001, { rng: rngFromSeq([0]), correctRate: 0.42 });
    expect(posts.evening.join("\n")).toContain("42%");
  });

  it("予約時刻にジッターが入る（±範囲内）", () => {
    const base = new Date("2026-06-01T07:00:00.000Z");
    const t = jitteredTime(base, 20, () => 1);
    expect(t.getTime()).toBe(base.getTime() + 20 * 60_000);
    const sched = scheduleFor(new Date("2026-06-01T00:00:00"), () => 0.5);
    expect(sched.morning.getHours()).toBe(7);
    expect(sched.evening.getHours()).toBe(21);
  });
});
