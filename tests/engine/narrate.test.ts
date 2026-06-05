import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  AnthropicNarrator,
  CorruptingNarrator,
  defaultNarrator,
  StubNarrator,
  toNarrationInput,
} from "../../lib/engine/narrate.js";
import type { GenerationResult } from "../../lib/engine/templates/types.js";

const sample: GenerationResult = {
  params: { V: { value: 200, unit: "V" } },
  answerValue: 3200,
  answerUnit: "kW",
  answerText: "3.2",
  facts: { V: 200, R: 8, X: 6 },
  defaultStatement: "問題文",
  defaultSolution: ["手順1", "P=3.2kW"],
  physicallyValid: true,
};

describe("toNarrationInput", () => {
  it("GenerationResult から NarrationInput に必要項目を写す", () => {
    const ni = toNarrationInput(sample, "三相交流電力", "理論");
    expect(ni.topic).toBe("三相交流電力");
    expect(ni.subject).toBe("理論");
    expect(ni.answerText).toBe("3.2");
    expect(ni.answerUnit).toBe("kW");
    expect(ni.facts.R).toBe(8);
    expect(ni.defaultSolution).toEqual(["手順1", "P=3.2kW"]);
  });
});

describe("StubNarrator / CorruptingNarrator", () => {
  it("Stub は既定文をそのまま返す（数値は当然一致）", async () => {
    const n = await new StubNarrator().narrate(toNarrationInput(sample, "t", "理論"));
    expect(n.statement).toBe("問題文");
    expect(n.solution).toEqual(["手順1", "P=3.2kW"]);
  });

  it("Corrupting は最終値を別物に差し替える（負テスト用）", async () => {
    const n = await new CorruptingNarrator().narrate(toNarrationInput(sample, "t", "理論"));
    expect(n.solution.join(" ")).toContain("999999");
  });
});

describe("defaultNarrator（環境で切替）", () => {
  let saved: string | undefined;
  beforeEach(() => {
    saved = process.env.ANTHROPIC_API_KEY;
  });
  afterEach(() => {
    if (saved === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = saved;
  });

  it("API キーが無ければ StubNarrator", () => {
    delete process.env.ANTHROPIC_API_KEY;
    expect(defaultNarrator()).toBeInstanceOf(StubNarrator);
  });

  it("API キーがあれば AnthropicNarrator", () => {
    process.env.ANTHROPIC_API_KEY = "sk-test-dummy";
    expect(defaultNarrator()).toBeInstanceOf(AnthropicNarrator);
  });
});

describe("AnthropicNarrator", () => {
  it("DENKEN_NARRATE_MODEL でモデルを上書きできる（API は呼ばない）", () => {
    const n = new AnthropicNarrator("claude-test-model");
    // model は private だが、コンストラクタ引数が反映されることを JSON 経由で確認。
    expect(JSON.stringify(n)).toContain("claude-test-model");
  });
});
