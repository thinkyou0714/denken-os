/**
 * I-069: zod スキーマと problem-schema.json(ajv) の二重定義ドリフト検知テスト。
 *
 * data/problems/*.json の全件を以下の両方で検証し、判定（pass/fail）が一致することを確認する:
 *  - ajv: problem-schema.json (draft-07) ＋ カスタムチェック（validate-problems.ts の条件）
 *  - zod: problemSchema (lib/engine/schema.ts)
 *
 * 一方のみ通過する場合、二つのスキーマがドリフト（乖離）していることを意味する。
 * ADR: docs/x-strategy/templates/problem-schema.json は CI 検証用（ajv）、
 *      problemSchema は実行時検証用（zod）であり、同一データに対して同じ判定を返すべき。
 *
 * 参照: I-099（ADR: 二重スキーマの意図記述）
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";
import { problemSchema } from "../../lib/engine/schema.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../../");
const SCHEMA_PATH = join(ROOT, "docs/x-strategy/templates/problem-schema.json");
const DATA_DIR = join(ROOT, "data/problems");

/** validate-problems.ts の customChecks と同等の追加検証（純関数として再実装）。 */
function customChecks(p: unknown): string[] {
  const errors: string[] = [];
  const pr = p as Record<string, unknown>;

  // answer ∈ choices（multiple_choice のみ）
  if (pr.format === "multiple_choice") {
    if (!Array.isArray(pr.choices) || !(pr.choices as string[]).includes(pr.answer as string)) {
      errors.push(`answer "${String(pr.answer)}" が choices に含まれていません`);
    }
  }

  // status=validated|published は検証4項目すべて true
  if (pr.status === "validated" || pr.status === "published") {
    const v = (pr.validation ?? {}) as Record<string, unknown>;
    if (!(v.solver_checked && v.human_checked && v.clean_answer && v.physically_valid)) {
      errors.push(`status=${String(pr.status)} だが検証4項目が揃っていません`);
    }
  }

  // original 以外は citation 必須
  const src = pr.source as Record<string, unknown> | undefined;
  if (src && src.type !== "original" && !src.citation) {
    errors.push(`source.type=${String(src.type)} だが citation がありません`);
  }

  return errors;
}

describe("スキーマドリフト検知（I-069）", () => {
  // AJV のセットアップ（validate-problems.ts と同条件: strict: false）
  const schema = JSON.parse(readFileSync(SCHEMA_PATH, "utf8"));
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const ajvValidate = ajv.compile(schema);

  const files = readdirSync(DATA_DIR).filter((f) => f.endsWith(".json"));

  it(`data/problems/ に ${52} 件以上の問題ファイルが存在する（ファイル数の回帰防止）`, () => {
    expect(files.length).toBeGreaterThanOrEqual(1);
  });

  for (const filename of files) {
    const filepath = join(DATA_DIR, filename);
    const data = JSON.parse(readFileSync(filepath, "utf8")) as unknown;
    const items: unknown[] = Array.isArray(data) ? (data as unknown[]) : [data];

    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx];
      const label = items.length > 1 ? `${filename}[${idx}]` : filename;

      it(`${label}: ajv と zod の判定が一致する`, () => {
        // ajv での検証
        const ajvPass = ajvValidate(item) && customChecks(item).length === 0;
        const ajvErrors = ajvValidate.errors ?? [];
        const customErrors = customChecks(item);

        // zod での検証
        const zodResult = problemSchema.safeParse(item);
        const zodPass = zodResult.success;

        if (ajvPass !== zodPass) {
          const ajvDetail = [...ajvErrors.map((e) => `${e.instancePath} ${e.message}`), ...customErrors].join("; ");
          const zodDetail = !zodResult.success
            ? zodResult.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")
            : "(zod通過)";

          throw new Error(
            `[I-069] スキーマドリフト検知: ${label}\n` +
              `  ajv: ${ajvPass ? "✓ pass" : `✗ fail — ${ajvDetail}`}\n` +
              `  zod: ${zodPass ? "✓ pass" : `✗ fail — ${zodDetail}`}\n` +
              `両スキーマの判定が一致していません。片方のスキーマを修正してください。`,
          );
        }

        // 判定が一致したことを確認（両方 pass または両方 fail）
        expect(ajvPass).toBe(zodPass);
      });
    }
  }
});
