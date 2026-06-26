import { describe, expect, it } from "vitest";
import { aggregate, applyStats, suggestDifficulty } from "../../lib/aggregate/aggregate.js";
import { loadProblemFixture } from "../helpers/fixtures.js";

const T0001 = loadProblemFixture("T-0001");
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

  it("votes が choices より多くても既知選択肢ぶんだけで集計する（防御）", () => {
    // choices は4件。余分な5件目の票は集計から除外され、答え(index1)の正答率は 50/100。
    const out = aggregate(T0001, { votes: [10, 50, 5, 35, 999] });
    expect(out.answered).toBe(100);
    expect(out.correctRate).toBeCloseTo(0.5, 5);
    expect(out.commonWrongChoice).toBe("9.6");
  });

  it("votes が choices より少なくても落ちない", () => {
    const out = aggregate(T0001, { votes: [10, 50] }); // 先頭2件のみ
    expect(out.answered).toBe(60);
    expect(out.correctRate).toBeCloseTo(50 / 60, 5);
  });
});
