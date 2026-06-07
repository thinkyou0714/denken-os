/**
 * schema ドリフト根絶（差分テスト, fast-check）。
 * schema-consistency.test.ts の代表5ケースを、乱数生成した大量の条件分岐ケースに拡張する。
 * ajv(problem-schema.json) と zod(schema.ts) が「受理/拒否」を一致させることを保証し、
 * enum 追加忘れ・条件分岐の片側更新といったドリフトを表現差に惑わされず捕捉する。
 *
 * 注: params.value∈realistic_range は JSON Schema に書けない cross-field 条件で、
 * ajv 側は validate-problems.ts のコードで補完する（answer∈choices と同じ役割分担）。
 * よってここでは params を有効値に固定し、enum/条件分岐フィールドのみを振る。
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { problemSchema } from "../../lib/engine/schema.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const handSchema = JSON.parse(readFileSync(join(ROOT, "docs/x-strategy/templates/problem-schema.json"), "utf8"));
const base = JSON.parse(readFileSync(join(ROOT, "data/problems/T-0001.json"), "utf8"));

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const ajvHand = ajv.compile(handSchema);

const SUBJECTS = ["理論", "電力", "機械", "法規", "電力管理", "機械制御"] as const;

const problemArb = fc
  .record({
    subject: fc.constantFrom(...SUBJECTS),
    format: fc.constantFrom(undefined, "multiple_choice", "numeric", "descriptive"),
    choices: fc.constantFrom(undefined, [] as string[], ["a"], ["a", "b"], ["a", "b", "c"]),
    difficulty: fc.constantFrom(0, 1, 2, 3, 5, 6),
    status: fc.constantFrom(undefined, "draft", "validated", "published", "retracted"),
    solver_checked: fc.boolean(),
    human_checked: fc.boolean(),
    clean_answer: fc.boolean(),
    physically_valid: fc.boolean(),
  })
  .map((r) => {
    const o: Record<string, unknown> = {
      ...base,
      subject: r.subject,
      difficulty: r.difficulty,
      validation: {
        solver_checked: r.solver_checked,
        human_checked: r.human_checked,
        clean_answer: r.clean_answer,
        physically_valid: r.physically_valid,
      },
      format: r.format,
      choices: r.choices,
      status: r.status,
    };
    // undefined キーは「未指定」として落とす（JSON 化）⇒ ajv/zod とも absent で一致。
    return JSON.parse(JSON.stringify(o));
  });

describe("schema ドリフト根絶（ajv ⇔ zod 差分, fast-check）", () => {
  it("乱数生成した条件分岐ケースで ajv と zod の受理/拒否が一致する", () => {
    fc.assert(
      fc.property(problemArb, (o) => {
        const hand = ajvHand(o) as boolean;
        const zod = problemSchema.safeParse(o).success;
        expect(hand, `ajv≠zod: ${JSON.stringify(o)}`).toBe(zod);
      }),
      { numRuns: 500 },
    );
  });
});
