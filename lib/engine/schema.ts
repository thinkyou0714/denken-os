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

/**
 * 記述採点の横断的な観点カテゴリ。問題固有の rubric id とは別に、
 * 「立式/計算/単位/論述/作図」という記述特有の能力軸で弱点を集計するためのタグ。
 * 例: 「立式は強いが論述が弱い」を科目横断で可視化する（15-descriptive-secondary #61）。
 */
export const rubricAspectEnum = z.enum(["立式", "計算", "単位", "論述", "作図"]);
export type RubricAspect = z.infer<typeof rubricAspectEnum>;

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

/**
 * 記述式(descriptive)の採点項目（部分点ルーブリック）。
 * 二次の記述は自動採点できないため、模範解答を採点観点に分解し、
 * 利用者が観点ごとに自己採点して部分点を合算する（15-descriptive-secondary 参照）。
 */
export const rubricItemSchema = z.object({
  id: z.string().min(1),
  /** 配点（>0）。合計が満点になる。 */
  points: z.number().positive(),
  /** 採点規準（この観点で何が書けていれば加点か）。 */
  criterion: z.string().min(1),
  /** 横断的な能力軸（立式/計算/単位/論述/作図）。観点別弱点集計のタグ。 */
  aspect: rubricAspectEnum.optional(),
  /** 自己採点の手がかりになるキーワード（記述に含まれるべき語）。 */
  keywords: z.array(z.string()).optional(),
  /** 合否に必須の観点か（単位明記・前提条件など）。 */
  required: z.boolean().optional(),
});

export type RubricItem = z.infer<typeof rubricItemSchema>;

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
    rubric: z.array(rubricItemSchema).optional(),
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
    // rubric は記述式(descriptive)専用。択一/数値には付けない。
    if (p.rubric && p.rubric.length > 0 && p.format !== "descriptive") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["rubric"],
        message: "rubric は format=descriptive のときだけ指定できます",
      });
    }
    // rubric の id は一意（採点集計のキーになる）。
    if (p.rubric && p.rubric.length > 0) {
      const ids = p.rubric.map((r) => r.id);
      if (new Set(ids).size !== ids.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["rubric"],
          message: "rubric の id は一意である必要があります",
        });
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
