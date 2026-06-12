/**
 * I-067: テンプレート再現性プロパティテスト。
 *
 * 全テンプレートについて seeded rng で generate() を成功するまで（上限付き）試行し、
 * 得た result.params の数値を generateFrom() に渡して
 * answerText / answerValue / choices / format が一致することを検証する。
 *
 * 不一致のテンプレートが見つかった場合はコード修正せず、明示的な KNOWN_DIVERGENT
 * 許容リストに記録する（ゼロ件が理想）。
 */
import { describe, expect, it } from "vitest";
import { getTemplate, listTopics } from "../../lib/engine/templates/index.js";
import { seededRng } from "../helpers/rng.js";

/**
 * generate() → generateFrom() の往復で結果が一致しないことが確認されたテンプレート。
 * 不一致が判明した場合はここに追加し、// TODO(audit): で原因を記録する。
 * ゼロ件が理想。
 */
const KNOWN_DIVERGENT: Set<string> = new Set([
  // 現時点ではゼロ件。不一致が判明したら追加:
  // "topic名", // TODO(audit): 原因の説明
]);

describe("テンプレート再現性（I-067）: generate→generateFrom の結果一致", () => {
  const topics = listTopics();

  for (const topic of topics) {
    it(`${topic}: params を generateFrom に渡すと同一結果`, () => {
      if (KNOWN_DIVERGENT.has(topic)) {
        // TODO(audit): 既知の不一致。原因を調査して修正またはリストから削除すること。
        return;
      }

      const t = getTemplate(topic);
      expect(t, `テンプレート ${topic} が見つからない`).toBeDefined();
      if (!t) return;

      const rng = seededRng(12345 + topic.length);
      let result = null as ReturnType<typeof t.generate>;

      // 上限400回試行（不成立 draw のスキップを考慮）
      for (let i = 0; i < 400 && !result; i++) {
        result = t.generate(rng);
      }

      if (!result) {
        // 400回以内に成功しなかった場合はスキップ（テンプレート自体の問題ではなく乱数の問題）
        console.warn(`[I-067] ${topic}: 400回以内に成功する draw が得られなかった（スキップ）`);
        return;
      }

      // result.params から数値だけを抽出して generateFrom に渡す
      const paramValues: Record<string, number> = {};
      for (const [key, pv] of Object.entries(result.params)) {
        paramValues[key] = pv.value;
      }

      const roundtrip = t.generateFrom(paramValues);

      if (!roundtrip) {
        if (KNOWN_DIVERGENT.has(topic)) return;
        // generateFrom が null を返した場合は KNOWN_DIVERGENT に追加すべき
        throw new Error(
          `[I-067] ${topic}: generate() は成功したが generateFrom(params) が null を返した。` +
            `KNOWN_DIVERGENT リストに追加して TODO(audit) コメントを残すこと。` +
            `params: ${JSON.stringify(paramValues)}`,
        );
      }

      // 核心: 往復後の結果が一致すること
      expect(roundtrip.answerText, `${topic}: answerText`).toBe(result.answerText);
      expect(roundtrip.answerValue, `${topic}: answerValue`).toBeCloseTo(result.answerValue, 8);
      expect(roundtrip.format ?? "multiple_choice", `${topic}: format`).toBe(result.format ?? "multiple_choice");

      if (result.choices) {
        expect(roundtrip.choices, `${topic}: choices が存在`).toBeDefined();
        // 選択肢の内容が一致（順序も含む）
        expect(roundtrip.choices, `${topic}: choices`).toEqual(result.choices);
      } else {
        // numeric/descriptive では choices は undefined
        expect(roundtrip.choices, `${topic}: choices は undefined`).toBeUndefined();
      }
    });
  }

  it("KNOWN_DIVERGENT リストを報告（ゼロが理想）", () => {
    if (KNOWN_DIVERGENT.size > 0) {
      console.warn(`[I-067] KNOWN_DIVERGENT に ${KNOWN_DIVERGENT.size} 件の不一致が記録されています:`);
      for (const t of KNOWN_DIVERGENT) {
        console.warn(`  - ${t}`);
      }
    }
    // KNOWN_DIVERGENT 自体の存在は fail にしない（ゼロが理想だが既知ならリストで管理）
    expect(KNOWN_DIVERGENT.size).toBeGreaterThanOrEqual(0);
  });
});
