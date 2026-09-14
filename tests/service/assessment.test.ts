import { describe, expect, it } from "vitest";
import { attemptSchema, gradePaper, learningMetrics, paperSchema } from "../../lib/service/assessment.js";
import { calculate, electricalModel, gradeQuantity, inspectSteps } from "../../lib/service/quantities.js";
import papers from "../../web/service/papers.json";
import key from "./fixtures/official-2026-answer-key.json";

describe("official paper and independent answer transcription", () => {
  for (const slug of ["theory", "power", "machine", "law"] as const)
    it(`grades every official blank for ${slug}`, () => {
      const paper = paperSchema.parse(papers.find((p) => p.id === `denken2-2026-${slug}`));
      const answers: Record<string, string> = {};
      paper.groups.forEach((group, i) => {
        if (slug === "machine" && i === 6)
          group.blanks.forEach((blank, j) => {
            answers[blank.id] =
              j % 2 ? (key.machineQ7Units[Math.floor(j / 2)] ?? "") : (key.machine[6]?.[Math.floor(j / 2)] ?? "");
          });
        else
          group.blanks.forEach((blank, j) => {
            answers[blank.id] = key[slug][i]?.[j] ?? "";
          });
      });
      expect(gradePaper(paper, answers, ["q7"])).toMatchObject({ earned: 90, possible: 90, invalidSelections: [] });
      expect(gradePaper(paper, {}, [])).toMatchObject({ earned: 0, possible: 90 });
      if (paper.selections.length)
        expect(gradePaper(paper, answers, ["q7", "q8"])).toMatchObject({
          earned: 80,
          possible: 90,
          invalidSelections: [paper.selections[0]?.id],
        });
    });
});
describe("arithmetic, units and independent physical checks", () => {
  it.each([
    ["-2^2", -4],
    ["2^-2", 0.25],
    ["2^3^2", 512],
    ["sqrt(144)+3*4", 24],
    ["1e3/4", 250],
  ])("calculates %s", (expression, result) => expect(calculate(String(expression))).toBe(result));
  it.each([
    "1/0",
    "sqrt(-1)",
    "process.exit()",
    "globalThis",
    "1;2",
    "2**3",
    "(1+2",
    "Infinity",
  ])("rejects unsafe or undefined %s", (expression) => expect(() => calculate(expression)).toThrow());
  it("converts SI units while rejecting dimensional mistakes", () => {
    const policy = { unit: "kW", absolute: 0.01, relative: 0.005, requireUnit: true, accepted: [] };
    expect(gradeQuantity("2400 W", "2.4", policy).correct).toBe(true);
    expect(gradeQuantity("2400 VA", "2.4", policy).correct).toBe(false);
    expect(gradeQuantity("2.4", "2.4", policy).correct).toBe(false);
    expect(gradeQuantity("2.4k", "2.4", policy).correct).toBeNull();
  });
  it("preserves independent physical identities and boundaries", () => {
    const v = electricalModel("phasor", 100, 3, 4);
    expect(v.current).toBe(20);
    expect(v.power).toBe(1200);
    expect(v.reactive).toBe(1600);
    expect(electricalModel("rc", 2, 0, 100).atTime).toBe(0);
    expect(electricalModel("rc", 2, 2, 100).atTime).toBeCloseTo(63.21205588);
    expect(electricalModel("control", 1, 1, 1).output).toBeCloseTo(0.2642411177);
    expect(electricalModel("percentZ", 5, 10, 20).newPercentZ).toBe(10);
    expect(() => electricalModel("loss", 100, 80, 30)).toThrow();
    expect(inspectSteps("3*4=12\n12/2=5\nV=IR").map((r) => r.status)).toEqual(["一致", "不一致", "保留"]);
  });
  it("does not count assisted or imported events as first unassisted performance", () => {
    const base = {
      id: "a",
      problemId: "p",
      revision: "v1",
      topic: "t",
      subject: "理論",
      skill: "計算",
      family: "f",
      answer: "2",
      correct: true,
      score: 1,
      hints: 1,
      revealed: false,
      mode: "practice",
      startedAt: 0,
      finishedAt: 1000,
    };
    const a = attemptSchema.parse(base);
    const b = attemptSchema.parse({ ...base, id: "b", hints: 0, finishedAt: 2000 });
    const c = attemptSchema.parse({ ...base, id: "c", family: "imported", mode: "validation", hints: 0 });
    expect(learningMetrics([a, b, c])).toMatchObject({ unassistedCount: 0, unassistedRate: null, assistedCount: 1 });
  });
});
