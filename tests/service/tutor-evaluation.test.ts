import { expect, it } from "vitest";
import { compareModelRuns, EVALUATION_CASES, validateTutorCandidate } from "../../lib/service/tutor-evaluation.js";

it.each(EVALUATION_CASES)("AI output gate: $id", (c) =>
  expect(validateTutorCandidate(c.response, c.sourceIds).pass).toBe(c.expected));
it("compares adapters with the same fixed cases and flags missing or duplicated cases", () => {
  const rows = EVALUATION_CASES.flatMap((c) =>
    ["adapter-A", "adapter-B"].map((model) => ({ model, caseId: c.id, response: c.response })),
  );
  expect(compareModelRuns(rows).map((g) => [g.passed, g.missing])).toEqual([
    [6, 0],
    [6, 0],
  ]);
  expect(() => compareModelRuns([rows[0], rows[0]])).toThrow();
});
