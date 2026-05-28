import { z } from "zod";

export const SUBJECTS = ["theory", "power", "machinery", "law"] as const;

export const SubjectSchema = z.enum(SUBJECTS);
export type Subject = z.infer<typeof SubjectSchema>;

export const SUBJECT_LABELS: Record<Subject, string> = {
  theory: "理論",
  power: "電力",
  machinery: "機械",
  law: "法規",
};

export function isSubject(value: unknown): value is Subject {
  return typeof value === "string" && (SUBJECTS as readonly string[]).includes(value);
}

/**
 * 問題スキーマ。question / explanation は Markdown(KaTeX 数式 `$...$` 対応)。
 * answerIndex は choices の 0 始まりインデックス。
 */
export const ProblemSchema = z
  .object({
    id: z.string().regex(/^[a-z]+-\d{3}$/, "id は `subject-001` 形式"),
    subject: SubjectSchema,
    topic: z.string().min(1),
    difficulty: z.number().int().min(1).max(5),
    year: z.number().int().min(1990).max(2100).optional(),
    /** 出典表記。例: "オリジナル", "電験三種令和X年" 等。 */
    source: z.string().optional(),
    question: z.string().min(1),
    choices: z.array(z.string().min(1)).min(2).max(6),
    answerIndex: z.number().int().min(0),
    explanation: z.string().min(1),
    tags: z.array(z.string()).default([]),
  })
  .refine((p) => p.answerIndex < p.choices.length, {
    message: "answerIndex が choices の範囲外",
    path: ["answerIndex"],
  });

export type Problem = z.infer<typeof ProblemSchema>;

export const ProblemListSchema = z.array(ProblemSchema).superRefine((list, ctx) => {
  const seen = new Set<string>();
  for (const [i, p] of list.entries()) {
    if (seen.has(p.id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `id が重複: ${p.id}`,
        path: [i, "id"],
      });
    }
    seen.add(p.id);
  }
});
