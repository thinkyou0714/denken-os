/**
 * tests/chat/knowledge-sections.test.ts
 *
 * KNOWLEDGE のセクション構造を検証する（II-135）。
 * 目次コメントのエントリ数と実際の KNOWLEDGE 配列の category 別カウントが一致するかを確認。
 * セクション境界の行番号精度検証は RG7 が拡充する。
 */
import { describe, expect, it } from "vitest";
import { KNOWLEDGE, KNOWLEDGE_META } from "../../lib/chat/knowledge.js";

/** 目次で宣言したセクション別エントリ数（II-135 で精緻化済み）。 */
const EXPECTED_COUNTS: Record<string, number> = {
  制度: 8,
  学習法: 6,
  理論: 14,
  電力: 13,
  機械: 12,
  法規: 8,
};

describe("KNOWLEDGE セクション構造（II-135）", () => {
  it("全エントリ数が目次の合計と一致する", () => {
    const total = Object.values(EXPECTED_COUNTS).reduce((a, b) => a + b, 0);
    expect(KNOWLEDGE.length).toBe(total);
  });

  for (const [category, expectedCount] of Object.entries(EXPECTED_COUNTS)) {
    it(`${category} セクションのエントリ数が ${expectedCount} 件`, () => {
      const actual = KNOWLEDGE.filter((e) => e.category === category).length;
      expect(actual).toBe(expectedCount);
    });
  }

  it("全エントリに citation が設定されている", () => {
    for (const entry of KNOWLEDGE) {
      expect(entry.citation, `id=${entry.id} の citation が空`).toBeTruthy();
    }
  });

  it("全エントリの id が一意である", () => {
    const ids = KNOWLEDGE.map((e) => e.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("related で参照している id が全て KNOWLEDGE に存在する", () => {
    const idSet = new Set(KNOWLEDGE.map((e) => e.id));
    for (const entry of KNOWLEDGE) {
      for (const ref of entry.related) {
        expect(idSet.has(ref), `id=${entry.id} の related="${ref}" が存在しない`).toBe(true);
      }
    }
  });
});

describe("KNOWLEDGE_META（II-137）", () => {
  it("全セクションのメタが存在する", () => {
    const metaCategories = new Set(KNOWLEDGE_META.map((m) => m.category));
    for (const cat of Object.keys(EXPECTED_COUNTS)) {
      expect(metaCategories.has(cat), `カテゴリ ${cat} の KNOWLEDGE_META がない`).toBe(true);
    }
  });

  it("lastReviewedAt が YYYY-MM-DD 形式", () => {
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    for (const meta of KNOWLEDGE_META) {
      expect(
        datePattern.test(meta.lastReviewedAt),
        `${meta.category} の lastReviewedAt が不正: ${meta.lastReviewedAt}`,
      ).toBe(true);
    }
  });

  it("reviewNote が空でない", () => {
    for (const meta of KNOWLEDGE_META) {
      expect(meta.reviewNote.length, `${meta.category} の reviewNote が空`).toBeGreaterThan(0);
    }
  });
});
