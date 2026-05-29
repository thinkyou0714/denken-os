/**
 * validate-problems.ts — CI品質ゲート（09-ci-quality-gate）の中核。
 *
 * data/problems/*.json を problem-schema.json(draft-07) で ajv 検証し、
 * schema で表現できない不変条件（answer ∈ choices / status=published は検証4項目true）を
 * カスタムチェックで補う。1件でも落ちれば非ゼロ終了。
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";
import addFormats from "ajv-formats";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SCHEMA_PATH = join(ROOT, "docs/x-strategy/templates/problem-schema.json");
const DATA_DIR = join(ROOT, "data/problems");

interface Failure {
  file: string;
  rule: string;
  message: string;
}

function customChecks(file: string, p: any): Failure[] {
  const failures: Failure[] = [];

  // answer ∈ choices（draft-07 では表現不可。03-quality-pipeline をコード化）
  if (p.format === "multiple_choice") {
    if (!Array.isArray(p.choices) || !p.choices.includes(p.answer)) {
      failures.push({ file, rule: "answer_in_choices", message: `answer "${p.answer}" が choices に含まれていません` });
    }
  }

  // status=validated|published は検証4項目すべて true
  if (p.status === "validated" || p.status === "published") {
    const v = p.validation ?? {};
    const ok = v.solver_checked && v.human_checked && v.clean_answer && v.physically_valid;
    if (!ok) {
      failures.push({
        file,
        rule: "validation_gate",
        message: `status=${p.status} だが検証4項目が揃っていません`,
      });
    }
  }

  // original 以外は citation 必須（schema 済だが二重チェック）
  if (p.source && p.source.type !== "original" && !p.source.citation) {
    failures.push({ file, rule: "citation_required", message: `source.type=${p.source.type} は citation 必須です` });
  }

  return failures;
}

function main() {
  const schema = JSON.parse(readFileSync(SCHEMA_PATH, "utf8"));
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);

  let files: string[];
  try {
    files = readdirSync(DATA_DIR).filter((f) => f.endsWith(".json"));
  } catch {
    console.error(`データディレクトリが見つかりません: ${DATA_DIR}`);
    process.exit(1);
    return;
  }

  if (files.length === 0) {
    console.error(`検証対象の問題JSONがありません: ${DATA_DIR}`);
    process.exit(1);
  }

  const failures: Failure[] = [];
  for (const f of files) {
    const full = join(DATA_DIR, f);
    let data: any;
    try {
      data = JSON.parse(readFileSync(full, "utf8"));
    } catch (e) {
      failures.push({ file: f, rule: "json_parse", message: String(e) });
      continue;
    }
    const items = Array.isArray(data) ? data : [data];
    items.forEach((p, idx) => {
      const label = Array.isArray(data) ? `${f}[${idx}]` : f;
      if (!validate(p)) {
        for (const err of validate.errors ?? []) {
          failures.push({ file: label, rule: "schema", message: `${err.instancePath} ${err.message}` });
        }
      }
      failures.push(...customChecks(label, p));
    });
  }

  if (failures.length > 0) {
    console.error(`❌ 問題データ検証に失敗（${failures.length} 件）:`);
    for (const fl of failures) {
      console.error(`  - [${fl.file}] (${fl.rule}) ${fl.message}`);
    }
    process.exit(1);
  }

  console.log(`✅ ${files.length} ファイルの問題データが problem-schema.json を通過しました。`);
}

main();
