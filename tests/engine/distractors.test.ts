/**
 * E1: 誤答の言語化(distractors)。テンプレが算出した「なぜ間違うか」を Problem に載せ、
 * schema が choice⊆choices かつ choice≠answer を強制することを検証する。
 */
import { describe, expect, it } from "vitest";
import { generate } from "../../lib/engine/generate.js";
import { StubNarrator } from "../../lib/engine/narrate.js";
import { problemSchema } from "../../lib/engine/schema.js";
import { threePhasePower } from "../../lib/engine/templates/index.js";

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

describe("E1: distractors の永続化と検証", () => {
  it("生成された三相電力問題は distractors を持ち、各 choice が choices に含まれ answer と異なる", async () => {
    const problems = await generate(threePhasePower, {
      count: 3,
      narrator: new StubNarrator(),
      rng: seededRng(0xc0ffee),
    });
    expect(problems.length).toBeGreaterThan(0);
    const withD = problems.filter((p) => p.distractors && p.distractors.length > 0);
    expect(withD.length).toBeGreaterThan(0);
    for (const p of withD) {
      for (const d of p.distractors ?? []) {
        expect(d.reason.length).toBeGreaterThan(0);
        expect(p.choices).toContain(d.choice);
        expect(d.choice).not.toBe(p.answer);
      }
    }
  });

  it("schema は choice∉choices / choice==answer の distractor を弾く", () => {
    const base = {
      id: "T",
      subject: "電力",
      topic: "三相交流電力",
      format: "multiple_choice",
      difficulty: 3,
      statement: "x",
      choices: ["1", "2", "3"],
      answer: "1",
      solution: ["s"],
      validation: { solver_checked: true, human_checked: true, clean_answer: true, physically_valid: true },
      source: { type: "original" },
    } as const;
    // 正常
    expect(problemSchema.safeParse({ ...base, distractors: [{ choice: "2", reason: "典型ミス" }] }).success).toBe(true);
    // choices に無い
    expect(problemSchema.safeParse({ ...base, distractors: [{ choice: "9", reason: "x" }] }).success).toBe(false);
    // answer と一致
    expect(problemSchema.safeParse({ ...base, distractors: [{ choice: "1", reason: "x" }] }).success).toBe(false);
    // reason 空
    expect(problemSchema.safeParse({ ...base, distractors: [{ choice: "2", reason: "" }] }).success).toBe(false);
  });
});
