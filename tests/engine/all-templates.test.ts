/**
 * 登録された全テンプレートに対する横断テスト。
 * 新テンプレを追加しても、ここが自動的に「生成→検証→制度整合」を要求する
 * （個別テストの書き忘れによる品質低下を防ぐ）。
 */
import { describe, expect, it } from "vitest";
import { generate } from "../../lib/engine/generate.js";
import { StubNarrator } from "../../lib/engine/narrate.js";
import { isExamSubjectValid } from "../../lib/engine/schema.js";
import { getTemplate, listTopics } from "../../lib/engine/templates/index.js";
import { validateProblem } from "../../lib/engine/validate.js";

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

describe("全テンプレ横断: 生成・検証・制度整合", () => {
  for (const topic of listTopics()) {
    const template = getTemplate(topic)!;

    it(`${topic}: exam↔subject が制度上成立する`, () => {
      expect(isExamSubjectValid(template.exam, template.subject)).toBe(true);
    });

    it(`${topic}: 15問生成→全件 validate 通過・difficulty 1-5`, async () => {
      const ps = await generate(template, { count: 15, narrator: new StubNarrator(), rng: seededRng(2025) });
      expect(ps.length).toBe(15);
      for (const p of ps) {
        expect(validateProblem(p).ok, `${topic} の生成問題が検証に失敗`).toBe(true);
        expect(p.difficulty).toBeGreaterThanOrEqual(1);
        expect(p.difficulty).toBeLessThanOrEqual(5);
        expect(isExamSubjectValid(p.exam, p.subject)).toBe(true);
      }
    });
  }
});
