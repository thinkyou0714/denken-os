/**
 * 全テンプレートの不変条件（property ベース）。個別の数値再現テスト
 * （templates / subject-coverage / descriptive / three-phase-power）を補完し、
 * 多数の seed で「綺麗・一意・物理的成立・params がレンジ内・解説整合」を横断検証する。
 */
import { describe, expect, it } from "vitest";
import { isCleanAnswer } from "../../lib/engine/clean.js";
import { getTemplate, listTopics } from "../../lib/engine/templates/index.js";
import { narrationMatchesAnswer } from "../../lib/engine/validate.js";

function seededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("テンプレート不変条件（全7種・多数 seed）", () => {
  for (const topic of listTopics()) {
    it(`${topic}: 物理成立・params レンジ内・選択肢一意・綺麗な値・解説整合`, () => {
      const t = getTemplate(topic)!;
      const rng = seededRng(12345);
      let drawn = 0;
      for (let i = 0; i < 400 && drawn < 60; i++) {
        const g = t.generate(rng);
        if (!g) continue;
        drawn += 1;

        // 物理的に成立する draw だけを返す。
        expect(g.physicallyValid).toBe(true);

        // 係数は宣言した realistic_range 内に収まる。
        for (const [key, spec] of Object.entries(t.paramSpecs)) {
          const pv = g.params[key];
          expect(pv, `${topic}.${key} が draw に存在`).toBeDefined();
          const [lo, hi] = spec.realistic_range;
          expect(pv!.value).toBeGreaterThanOrEqual(lo);
          expect(pv!.value).toBeLessThanOrEqual(hi);
        }

        const format = g.format ?? "multiple_choice";
        if (format === "multiple_choice") {
          expect(g.choices, "MC は choices を持つ").toBeDefined();
          expect(g.choices!.length).toBeGreaterThanOrEqual(2);
          // 選択肢は相互に重複しない。
          expect(new Set(g.choices).size).toBe(g.choices!.length);
          // 正解は選択肢に含まれる。
          expect(g.choices).toContain(g.answerText);
        } else {
          // numeric / descriptive は選択肢を持たない。
          expect(g.choices).toBeUndefined();
        }

        // 数値の答えは「綺麗な値」。
        const num = Number(g.answerText);
        if (Number.isFinite(num)) expect(isCleanAnswer(num)).toBe(true);

        // 既定の解説に最終値が現れる（反ハルシネーション照合が成立する）。
        expect(narrationMatchesAnswer(g.defaultSolution, g.answerText)).toBe(true);
      }
      // 各テンプレで十分な数の有効 draw が得られる（歩留まりの回帰防止）。
      expect(drawn).toBeGreaterThanOrEqual(20);
    });
  }
});
