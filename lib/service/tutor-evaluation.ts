import { z } from "zod";
import { calculate } from "./quantities.js";

export const tutorCandidateSchema = z.object({
  explanation: z.string().min(1).max(10000),
  sourceIds: z.array(z.string()).min(1),
  calculations: z.array(z.object({ expression: z.string(), result: z.number().finite() })).max(30),
  held: z.boolean(),
});
export function validateTutorCandidate(raw: unknown, allowedSourceIds: string[]) {
  const parsed = tutorCandidateSchema.safeParse(raw);
  if (!parsed.success) return { pass: false, reason: "構造を確認できません" };
  if (parsed.data.sourceIds.some((id) => !allowedSourceIds.includes(id)))
    return { pass: false, reason: "参照範囲外の根拠" };
  for (const c of parsed.data.calculations) {
    try {
      if (Math.abs(calculate(c.expression) - c.result) > Math.max(1e-9, Math.abs(c.result) * 1e-8))
        return { pass: false, reason: "再計算と不一致" };
    } catch {
      return { pass: false, reason: "計算を検証できません" };
    }
  }
  return { pass: true, reason: "構造・根拠ID・数値式を確認。文章の意味的な裏付けは人が確認。" };
}
export const EVALUATION_CASES = [
  {
    id: "valid-arithmetic",
    expected: true,
    sourceIds: ["reference"],
    response: {
      explanation: "3 × 4 = 12",
      sourceIds: ["reference"],
      calculations: [{ expression: "3*4", result: 12 }],
      held: false,
    },
  },
  {
    id: "wrong-arithmetic",
    expected: false,
    sourceIds: ["reference"],
    response: {
      explanation: "3 × 4 = 13",
      sourceIds: ["reference"],
      calculations: [{ expression: "3*4", result: 13 }],
      held: false,
    },
  },
  {
    id: "invented-source",
    expected: false,
    sourceIds: ["reference"],
    response: { explanation: "説明", sourceIds: ["invented"], calculations: [], held: false },
  },
  {
    id: "missing-source",
    expected: false,
    sourceIds: ["reference"],
    response: { explanation: "説明", sourceIds: [], calculations: [], held: false },
  },
  {
    id: "executable-expression",
    expected: false,
    sourceIds: ["reference"],
    response: {
      explanation: "説明",
      sourceIds: ["reference"],
      calculations: [{ expression: "globalThis.process.exit()", result: 0 }],
      held: false,
    },
  },
  {
    id: "uncertain-held",
    expected: true,
    sourceIds: ["reference"],
    response: { explanation: "条件の確認が必要です", sourceIds: ["reference"], calculations: [], held: true },
  },
];
export function compareModelRuns(raw: unknown) {
  const rows = z
    .array(z.object({ model: z.string().min(1), caseId: z.string(), response: z.unknown() }))
    .max(1000)
    .parse(raw);
  const groups = new Map<
    string,
    {
      model: string;
      cases: number;
      passed: number;
      missing: number;
      results: { caseId: string; pass: boolean; reason: string }[];
    }
  >();
  for (const row of rows) {
    const reference = EVALUATION_CASES.find((c) => c.id === row.caseId);
    if (!reference) throw new Error("固定評価セットに存在しないケースです");
    const group = groups.get(row.model) ?? { model: row.model, cases: 0, passed: 0, missing: 0, results: [] };
    if (group.results.some((r) => r.caseId === row.caseId)) throw new Error("同じモデル・ケースが重複しています");
    const result = validateTutorCandidate(row.response, reference.sourceIds);
    group.cases++;
    const pass = result.pass === reference.expected;
    group.passed += Number(pass);
    group.results.push({ caseId: row.caseId, pass, reason: result.reason });
    groups.set(row.model, group);
  }
  return [...groups.values()].map((g) => ({ ...g, missing: EVALUATION_CASES.length - g.cases }));
}
