import { describe, expect, it } from "vitest";
import { generate, generateOne } from "../../lib/engine/generate.js";
import { CorruptingNarrator, StubNarrator } from "../../lib/engine/narrate.js";
import { threePhasePower } from "../../lib/engine/templates/index.js";
import { answerInChoices, answerIsClean, validateProblem } from "../../lib/engine/validate.js";
import { seededRng } from "../helpers/rng.js";

describe("generate パイプライン", () => {
  it("100問生成 → 全件 validate 通過 / answer∈choices / clean / physically_valid", async () => {
    const problems = await generate(threePhasePower, {
      count: 100,
      narrator: new StubNarrator(),
      rng: seededRng(42),
    });
    expect(problems.length).toBe(100);
    for (const p of problems) {
      expect(validateProblem(p).ok).toBe(true);
      expect(answerInChoices(p)).toBe(true);
      expect(answerIsClean(p)).toBe(true);
      expect(p.validation.physically_valid).toBe(true);
      expect(p.validation.solver_checked).toBe(true);
      // 自動生成段階では human_checked 未了 → status は draft（validated にしない）
      expect(p.validation.human_checked).toBe(false);
      expect(p.status).toBe("draft");
    }
  });

  it("改題(modified)で citation 無しは reject される（負テスト）", async () => {
    const p = await generateOne(threePhasePower, {
      id: "X-0001",
      source: "past_exam_modified",
      // citation 無し
      narrator: new StubNarrator(),
      rng: seededRng(7),
      maxAttempts: 50,
    });
    expect(p).toBeNull();
  });

  it("改題でも citation があれば生成できる", async () => {
    const p = await generateOne(threePhasePower, {
      id: "X-0002",
      source: "past_exam_modified",
      citation: "令和5年度 第二種 一次 理論（改題）",
      narrator: new StubNarrator(),
      rng: seededRng(7),
      maxAttempts: 50,
    });
    expect(p).not.toBeNull();
    expect(p!.source.citation).toContain("改題");
  });

  it("解説の最終値とコード正解の不一致を検出して破棄する（モック負テスト）", async () => {
    const p = await generateOne(threePhasePower, {
      id: "X-0003",
      source: "original",
      narrator: new CorruptingNarrator(),
      rng: seededRng(7),
      maxAttempts: 50,
    });
    expect(p).toBeNull();
  });
});
