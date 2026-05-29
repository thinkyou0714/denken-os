import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { aggregate, applyStats, suggestDifficulty } from "../../lib/aggregate/aggregate.js";
import type { Problem } from "../../lib/engine/schema.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const T0001: Problem = JSON.parse(
  readFileSync(join(__dirname, "../../data/problems/T-0001.json"), "utf8"),
);
// choices: ["2.56","3.2","4.0","9.6"], answer "3.2" (index 1)

describe("aggregate", () => {
  it("poll 結果から正答率・最頻誤答を算出する", () => {
    const out = aggregate(T0001, { votes: [10, 50, 5, 35] }); // 総100, 正解=50
    expect(out.answered).toBe(100);
    expect(out.correctRate).toBeCloseTo(0.5, 5);
    expect(out.commonWrongChoice).toBe("9.6"); // 誤答最多=35票
  });

  it("poll が無い投稿は集計不可としてスキップを明示する", () => {
    const out = aggregate(T0001, null);
    expect(out.skipped).toBe("no_poll");
    expect(out.answered).toBe(0);
  });

  it("stats 更新が schema の範囲制約(rate∈[0,1], answered>=0)を満たす", () => {
    const out = aggregate(T0001, { votes: [0, 80, 0, 20] });
    const updated = applyStats(T0001, out);
    expect(updated.stats!.correct_rate!).toBeGreaterThanOrEqual(0);
    expect(updated.stats!.correct_rate!).toBeLessThanOrEqual(1);
    expect(updated.stats!.answered!).toBeGreaterThanOrEqual(0);
  });

  it("難易度補正は提案のみ（低正答率ほど高難度）", () => {
    expect(suggestDifficulty(0.95)).toBe(1);
    expect(suggestDifficulty(0.2)).toBe(5);
    // applyStats は difficulty を上書きしない
    const out = aggregate(T0001, { votes: [40, 10, 30, 20] });
    const updated = applyStats(T0001, out);
    expect(updated.difficulty).toBe(T0001.difficulty);
  });
});
