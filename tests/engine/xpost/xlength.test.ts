import { describe, expect, it } from "vitest";
import { splitIntoThread, xWeightedLength } from "../../lib/engine/xlength.js";

describe("xWeightedLength", () => {
  it("ASCII は1カウント", () => {
    expect(xWeightedLength("hello")).toBe(5);
  });
  it("日本語は1文字=2カウント", () => {
    expect(xWeightedLength("電験")).toBe(4);
    expect(xWeightedLength("あ")).toBe(2);
  });
  it("混在", () => {
    expect(xWeightedLength("電験2種")).toBe(2 + 2 + 1 + 2); // 電,験=2 / 2=1 / 種=2
  });
});

describe("splitIntoThread", () => {
  it("280以内なら連番を付けず1ポスト", () => {
    const out = splitIntoThread("短い投稿");
    expect(out.length).toBe(1);
    expect(out[0]).toBe("短い投稿");
  });

  it("長文は複数ポストに分割され、各ポストが280以内で連番付き", () => {
    const long = Array.from({ length: 60 }, (_, i) => `これは行${i}の日本語テキストです`).join("\n");
    const out = splitIntoThread(long);
    expect(out.length).toBeGreaterThan(1);
    for (const post of out) {
      expect(xWeightedLength(post)).toBeLessThanOrEqual(280);
    }
    expect(out[0]).toMatch(/\(1\/\d+\)$/);
  });

  it("1行が長すぎてもハード分割で280以内に収める", () => {
    const oneLongLine = "あ".repeat(400); // 重み800
    const out = splitIntoThread(oneLongLine);
    for (const post of out) {
      expect(xWeightedLength(post)).toBeLessThanOrEqual(280);
    }
  });
});
