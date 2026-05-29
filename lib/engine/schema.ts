/**
 * problem-schema.json (docs/x-strategy/templates/problem-schema.json) を
 * 実行時検証できる zod ミラー。
 *
 * draft-07 で表現できる不変条件（source citation 必須 / multiple_choice の choices>=2 /
 * status=validated|published のとき検証4項目 true）はここで表現する。
 * draft-07 で表現できない「answer ∈ choices」は validate.ts のカスタム検証で担保する
 * （problem-schema.json の $comment と同じ役割分担）。
 */
import { z } from "zod";

export const examEnum = z.enum(["denken2_primary", "denken2_secondary", "denken3"]);
export const subjectEnum = z.enum(["理論", "電力", "機械", "法規", "電力管理", "機械制御"]);
export const formatEnum = z.enum(["multiple_choice", "numeric", "descriptive"]);
export const sourceTypeEnum = z.enum(["original", "past_exam_modified", "past_exam_quoted"]);
export const statusEnum = z.enum(["draft", "validated", "published", "retracted"]);

export type Exam = z.infer<typeof examEnum>;
export type Subject = z.infer<typeof subjectEnum>;
export type ProblemFormat = z.infer<typeof formatEnum>;
export type SourceType = z.infer<typeof sourceTypeEnum>;
export type ProblemStatus = z.infer<typeof statusEnum>;

/**
 * 試験区分ごとに「実在する科目」。電験の制度構造（一次/三種=4科目、二種二次=2科目）。
 * 例: 「電力管理」は二種二次のみ、三種に電力管理は存在しない。
 * これを満たさない (exam, subject) は制度上あり得ない問題 ⇒ 検証で弾く。
 */
export const EXAM_SUBJECTS: Record<Exam, readonly Subject[]> = {
  denken3: ["理論", "電力", "機械", "法規"],
  denken2_primary: ["理論", "電力", "機械", "法規"],
  denken2_secondary: ["電力管理", "機械制御"],
};

/** (exam, subject) が制度上成立するか。exam 未指定なら制約なし(true)。 */
export function isExamSubjectValid(exam: Exam | undefined, subject: Subject): boolean {
  if (!exam) return true;
  return EXAM_SUBJECTS[exam].includes(subject);
}

const paramField = z.object({
  value: z.number(),
  unit: z.string().optional(),
  realistic_range: z.tuple([z.number(), z.number()]).optional(),
});

export const validationSchema = z.object({
  solver_checked: z.boolean(),
  human_checked: z.boolean(),
  clean_answer: z.boolean(),
  physically_valid: z.boolean(),
  supervisor_checked: z.boolean().optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export const sourceSchema = z
  .object({
    type: sourceTypeEnum,
    citation: z.string().optional(),
  })
  .refine((s) => s.type === "original" || (s.citation?.trim().length ?? 0) > 0, {
    message: "source.type が original 以外のときは citation が必須です",
    path: ["citation"],
  });

export const statsSchema = z.object({
  answered: z.number().int().min(0).optional(),
  correct_rate: z.number().min(0).max(1).optional(),
  common_wrong_choice: z.string().optional(),
});

export const problemSchema = z
  .object({
    id: z.string().min(1),
    exam: examEnum.optional(),
    subject: subjectEnum,
    topic: z.string().min(1),
    format: formatEnum.optional(),
    difficulty: z.number().int().min(1).max(5),
    params: z.record(paramField).optional(),
    statement: z.string().min(1),
    figure: z.string().optional(),
    choices: z.array(z.string()).optional(),
    answer: z.string().min(1),
    solution: z.array(z.string()).min(1),
    validation: validationSchema,
    source: sourceSchema,
    stats: statsSchema.optional(),
    status: statusEnum.optional(),
  })
  .superRefine((p, ctx) => {
    // multiple_choice は choices>=2 必須（draft-07 の allOf と同じ）
    if (p.format === "multiple_choice") {
      if (!p.choices || p.choices.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["choices"],
          message: "multiple_choice では choices が 2 件以上必要です",
        });
      }
    }
    // exam↔subject の整合（制度上あり得ない区分×科目を弾く。problem-schema.json の allOf と同じ）
    if (p.exam && !isExamSubjectValid(p.exam, p.subject)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["subject"],
        message: `subject="${p.subject}" は exam="${p.exam}" に存在しない科目です（許容: ${EXAM_SUBJECTS[p.exam].join("/")}）`,
      });
    }
    // status=validated|published は検証4項目すべて true（draft-07 の allOf と同じ）
    if (p.status === "validated" || p.status === "published") {
      const v = p.validation;
      if (!(v.solver_checked && v.human_checked && v.clean_answer && v.physically_valid)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["validation"],
          message:
            "status=validated|published は solver_checked/human_checked/clean_answer/physically_valid が全て true である必要があります",
        });
      }
    }
  });

export type Problem = z.infer<typeof problemSchema>;
