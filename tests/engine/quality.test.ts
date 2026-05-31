/**
 * 品質ユーティリティと品質関連の不変条件（14-best-practices）。
 *  - gradingTolerance: 相対許容誤差。
 *  - distractorSanity / assessProblem: 誤答妥当性・完全性スコア。
 *  - generate のバッチ重複排除。
 *  - 同期速度の非現実的誤答が排除されていること。
 */
import { describe, expect, it } from "vitest";
import { generate } from "../../lib/engine/generate.js";
import { StubNarrator } from "../../lib/engine/narrate.js";
import { assessProblem, distractorSanity, gradingTolerance, summarizeQuality } from "../../lib/engine/quality.js";
import type { Problem } from "../../lib/engine/schema.js";
import { getTemplate, listTopics, synchronousSpeed } from "../../lib/engine/templates/index.js";

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

describe("gradingTolerance（相対許容誤差）", () => {
  it("大きい答えには相対1%、小さい答えには下限0.01を返す", () => {
    expect(gradingTolerance(5880)).toBeCloseTo(59, 0); // 1% ≒ 58.8 → 有効2桁
    expect(gradingTolerance(75)).toBeCloseTo(0.75, 5);
    expect(gradingTolerance(0.4)).toBe(0.01); // 1%=0.004 < 下限0.01
  });
});

describe("distractorSanity（誤答妥当性）", () => {
  it("符号反転・0・1000倍超の桁違いは broken", () => {
    expect(distractorSanity(100, -50)).toBe("broken");
    expect(distractorSanity(100, 0)).toBe("broken");
    expect(distractorSanity(1, 2000)).toBe("broken");
  });
  it("桁が大きく離れる（1/50〜50外）は extreme", () => {
    expect(distractorSanity(2000, 20)).toBe("extreme"); // 1/100
    expect(distractorSanity(100, 6000)).toBe("extreme"); // 60倍
  });
  it("近い値は ok", () => {
    expect(distractorSanity(100, 60)).toBe("ok");
    expect(distractorSanity(100, 150)).toBe("ok");
  });
});

describe("assessProblem", () => {
  const base: Problem = {
    id: "Q-1",
    subject: "理論",
    topic: "分圧の法則",
    format: "multiple_choice",
    difficulty: 1,
    statement: "?",
    choices: ["40", "60", "100", "150"],
    answer: "60",
    solution: ["step1", "step2"],
    choice_explanations: [
      { choice: "40", correct: false, explanation: "誤り" },
      { choice: "60", correct: true, explanation: "正解" },
      { choice: "100", correct: false, explanation: "誤り" },
      { choice: "150", correct: false, explanation: "誤り" },
    ],
    formulas: ["V2=E·R2/(R1+R2)"],
    learning_objectives: ["分圧"],
    hints: ["I共通"],
    tags: ["理論"],
    estimated_time_sec: 90,
    validation: { solver_checked: true, human_checked: true, clean_answer: true, physically_valid: true },
    source: { type: "original", citation: "x" },
  };

  it("完全な良問は高スコア・error なし", () => {
    const r = assessProblem(base);
    expect(r.findings.filter((f) => f.severity === "error")).toEqual([]);
    expect(r.score).toBeGreaterThanOrEqual(95);
  });

  it("選択肢重複・answer∉choices は error", () => {
    const dup = assessProblem({ ...base, choices: ["60", "60", "100", "150"] });
    expect(dup.findings.some((f) => f.code === "duplicate_choices")).toBe(true);
    const miss = assessProblem({ ...base, answer: "999" });
    expect(miss.findings.some((f) => f.code === "answer_not_in_choices")).toBe(true);
  });

  it("公式/ヒント等の欠落は warn としてスコアを下げる", () => {
    const thin = assessProblem({ ...base, formulas: undefined, hints: undefined, tags: undefined });
    expect(thin.score).toBeLessThan(base ? assessProblem(base).score : 100);
    expect(thin.findings.some((f) => f.code === "no_formulas")).toBe(true);
  });
});

describe("generate のバッチ重複排除", () => {
  it("十分な母集合では生成バッチに重複がない", async () => {
    const ps = await generate(getTemplate("分圧の法則")!, {
      count: 20,
      narrator: new StubNarrator(),
      rng: seededRng(7),
    });
    const sigs = ps.map((p) => `${p.topic}|${p.answer}|${JSON.stringify(p.params)}`);
    expect(new Set(sigs).size).toBe(sigs.length);
  });

  it("母集合が小さくても要求件数は満たす（重複許容で件数維持）", async () => {
    const ps = await generate(getTemplate("絶縁耐力試験電圧")!, {
      count: 12,
      narrator: new StubNarrator(),
      rng: seededRng(7),
    });
    expect(ps.length).toBe(12);
  });
});

describe("同期速度の誤答妥当性", () => {
  it("荒唐無稽な 120·f·p（極端値）を選択肢に含まない", () => {
    const g = synchronousSpeed.generateFrom({ frequency: 60, poles: 4 });
    expect(g).not.toBeNull();
    // 120·60·4 = 28800 のような非現実値が無いこと
    expect(g!.choices).not.toContain("28800");
    const ans = Number(g!.answerText);
    for (const c of g!.choices ?? []) {
      expect(distractorSanity(ans, Number(c))).not.toBe("broken");
    }
  });
});

describe("生成サンプルの品質（全テンプレ横断）", () => {
  it("各テンプレの生成バッチに error 重大度の所見が無い", async () => {
    for (const topic of listTopics()) {
      const ps = await generate(getTemplate(topic)!, { count: 8, narrator: new StubNarrator(), rng: seededRng(55) });
      const s = summarizeQuality(ps);
      expect(s.errorCount, `${topic} に品質 error`).toBe(0);
    }
  });
});
