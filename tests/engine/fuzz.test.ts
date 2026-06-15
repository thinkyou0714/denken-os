import { describe, expect, it } from "vitest";
import { buildChoices, constrainRange, percentage, pick } from "../../lib/engine/templates/helpers.js";
import { seededRng } from "../helpers/rng.js";

describe("fuzz: pick", () => {
  it("1000回ランダム入力で境界を超えない", () => {
    const rng = seededRng(1);
    for (let i = 0; i < 1000; i++) {
      const len = Math.floor(rng() * 10) + 1;
      const arr = Array.from({ length: len }, (_, j) => j);
      const r = pick(arr, rng);
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThan(len);
    }
  });
  it("空配列でthrowする", () => {
    expect(() => pick([], () => 0.5)).toThrow("pick: empty array");
  });
});

describe("fuzz: buildChoices", () => {
  it("1000回ランダム入力: 正解が常に含まれ・重複なし・ソート済み", () => {
    const rng = seededRng(2);
    for (let i = 0; i < 1000; i++) {
      const correct = `${(rng() * 1000).toFixed(1)}`;
      const distCount = Math.floor(rng() * 5) + 1;
      const distractors = Array.from({ length: distCount }, () => `${(rng() * 1000).toFixed(1)}`);
      const choices = buildChoices(correct, distractors);
      expect(choices).toContain(correct);
      expect(new Set(choices).size).toBe(choices.length); // 重複なし
      // ソート確認: 全て数値ならば昇順
      const nums = choices.map(Number);
      if (nums.every(Number.isFinite)) {
        for (let j = 1; j < nums.length; j++) {
          expect(nums[j] as number).toBeGreaterThanOrEqual(nums[j - 1] as number);
        }
      }
    }
  });
});

describe("fuzz: percentage", () => {
  it("1000回ランダム入力: NaN/無限大/範囲外を検査", () => {
    const rng = seededRng(3);
    for (let i = 0; i < 1000; i++) {
      const num = (rng() - 0.5) * 2000;
      const den = rng() < 0.05 ? 0 : (rng() - 0.5) * 2000;
      const result = percentage(num, den);
      if (den === 0) {
        expect(Number.isNaN(result)).toBe(true);
      } else {
        expect(Number.isFinite(result)).toBe(true);
        expect(result).toBeCloseTo((num / den) * 100, 8);
      }
    }
  });
});

describe("fuzz: constrainRange", () => {
  it("1000回ランダム入力: 境界条件を正確に検出", () => {
    const rng = seededRng(4);
    for (let i = 0; i < 1000; i++) {
      const min = (rng() - 0.5) * 100;
      const max = min + rng() * 100;
      const value = (rng() - 0.5) * 200;
      const result = constrainRange(value, min, max);
      expect(result).toBe(value >= min && value <= max);
    }
  });
});
