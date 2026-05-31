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

export const examEnum = z.enum([
  "denken1_primary",
  "denken1_secondary",
  "denken2_primary",
  "denken2_secondary",
  "denken3",
]);
export const subjectEnum = z.enum(["理論", "電力", "機械", "法規", "電力管理", "機械制御"]);
export const formatEnum = z.enum(["multiple_choice", "numeric", "descriptive"]);
export const sourceTypeEnum = z.enum(["original", "past_exam_modified", "past_exam_quoted"]);
export const statusEnum = z.enum(["draft", "validated", "published", "retracted"]);
/**
 * 認知レベル（Bloom 改訂版の下位4段, QTI/item-bank メタ標準）。
 * 14-best-practices §認知レベル。電験は apply が中心、法規の暗記系は remember/understand。
 */
export const cognitiveLevelEnum = z.enum(["remember", "understand", "apply", "analyze"]);

export type Exam = z.infer<typeof examEnum>;
export type Subject = z.infer<typeof subjectEnum>;
export type ProblemFormat = z.infer<typeof formatEnum>;
export type SourceType = z.infer<typeof sourceTypeEnum>;
export type ProblemStatus = z.infer<typeof statusEnum>;
export type CognitiveLevel = z.infer<typeof cognitiveLevelEnum>;

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
  // 識別力(discrimination): 上位群と下位群の正答率差（item analysis, 任意）。
  discrimination: z.number().min(-1).max(1).optional(),
});

/**
 * 誤答解説（13-best-practices §18 ＝ 最大の学習資産）。
 * 各選択肢が「なぜ正解/不正解か」「どの典型ミスか」を保持する。
 * multiple_choice では choice は choices のいずれかと一致させる（validate.ts で担保）。
 */
export const choiceExplanationSchema = z.object({
  choice: z.string().min(1),
  correct: z.boolean(),
  explanation: z.string().min(1),
});

/** 数値採点の許容誤差と単位（有効数字差・丸め差の吸収, §24）。 */
export const numericGradingSchema = z.object({
  tolerance: z.number().min(0),
  unit: z.string().optional(),
});

/** 過去問の出典メタ（年度・回・問番号, §4）。 */
export const examMetaSchema = z.object({
  year: z.number().int().optional(),
  era: z.string().optional(), // 例: "令和6年度"
  session: z.string().optional(), // 例: "上期" / "下期" / "一次" / "二次"
  question_no: z.string().optional(), // 例: "問7" / "B-15"
});

/** 法令条文などの根拠参照（§5）。 */
export const referenceSchema = z.object({
  label: z.string().min(1),
  article: z.string().optional(), // 例: "電技解釈 第17条"
  url: z.string().optional(),
});

/** B問題の小問（§6）。 */
export const subQuestionSchema = z.object({
  statement: z.string().min(1),
  choices: z.array(z.string()).optional(),
  answer: z.string().min(1),
  solution: z.array(z.string()).optional(),
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
    // --- 教育的メタデータ（すべて任意・後方互換, 13-best-practices）---
    tags: z.array(z.string()).optional(),
    learning_objectives: z.array(z.string()).optional(),
    formulas: z.array(z.string()).optional(),
    hints: z.array(z.string()).optional(),
    choice_explanations: z.array(choiceExplanationSchema).optional(),
    related_topics: z.array(z.string()).optional(),
    prerequisites: z.array(z.string()).optional(),
    estimated_time_sec: z.number().int().positive().optional(),
    cognitive_level: cognitiveLevelEnum.optional(),
    numeric: numericGradingSchema.optional(),
    exam_meta: examMetaSchema.optional(),
    references: z.array(referenceSchema).optional(),
    grading_points: z.array(z.string()).optional(), // descriptive の採点観点
    sub_questions: z.array(subQuestionSchema).optional(), // B問題の小問
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
    // choice_explanations の一貫性（multiple_choice のとき）:
    //  - 各 choice は choices のいずれかと一致
    //  - correct=true はちょうど1件かつ answer と一致
    if (p.format === "multiple_choice" && p.choice_explanations && p.choices) {
      for (const ce of p.choice_explanations) {
        if (!p.choices.includes(ce.choice)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["choice_explanations"],
            message: `choice_explanations の "${ce.choice}" が choices に含まれていません`,
          });
        }
      }
      const correctOnes = p.choice_explanations.filter((c) => c.correct);
      if (correctOnes.length > 0) {
        if (correctOnes.length !== 1 || correctOnes[0]!.choice !== p.answer) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["choice_explanations"],
            message: "choice_explanations の correct=true はちょうど1件かつ answer と一致する必要があります",
          });
        }
      }
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
