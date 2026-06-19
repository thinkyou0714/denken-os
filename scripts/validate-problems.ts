/**
 * validate-problems.ts — CI品質ゲート（09-ci-quality-gate）の中核。
 *
 * data/problems/*.json を problem-schema.json(draft-07) で ajv 検証し、
 * schema で表現できない不変条件（answer ∈ choices / status=published は検証4項目true）を
 * カスタムチェックで補う。1件でも落ちれば非ゼロ終了。
 *
 * AJV strict モードについて（I-078）:
 *   problem-schema.json の draft-07 allOf/if/then 構造を AJV v8 strict 対応済み。
 *   schema で表現できる構造不備は compile 時に検出するため strict: true で検証する。
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { problemSchema } from "../lib/engine/schema.js";
import { checkProblemInvariants } from "../lib/engine/validate.js";
import { printHelp, validateOrExit } from "./shared.js";

const HELP = `\
validate-problems — data/problems/*.json を JSON Schema(AJV) で検証する

使い方:
  npm run validate:data [-- オプション]

オプション:
  --help, -h  このヘルプを表示して終了

終了コード:
  0  全ファイル検証通過
  1  1件以上の検証失敗、またはデータディレクトリが見つからない
`;

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SCHEMA_PATH = join(ROOT, "docs/x-strategy/templates/problem-schema.json");
const DATA_DIR = join(ROOT, "data/problems");

interface Failure {
  file: string;
  rule: string;
  message: string;
}

/** カスタム検証ルール（pure function, テスト可能）。 */
export function customChecks(file: string, p: unknown): Failure[] {
  const failures: Failure[] = [];
  const pr = p as Record<string, unknown>;

  // Code-side invariants (answer ∈ choices, clean_answer 整合) — shared with the
  // zod path (validateProblem) so the CI/ajv gate enforces the SAME invariant set
  // (PAR-01). Previously this path only checked answer ∈ choices, letting a
  // clean_answer=true problem with a non-clean answer pass CI.
  const parsed = problemSchema.safeParse(p);
  if (parsed.success) {
    for (const issue of checkProblemInvariants(parsed.data)) {
      failures.push({ file, rule: issue.rule, message: `${file}: ${issue.message}` });
    }
  }

  // status=validated|published は検証4項目すべて true
  if (pr.status === "validated" || pr.status === "published") {
    const v = (pr.validation ?? {}) as Record<string, unknown>;
    const ok = v.solver_checked && v.human_checked && v.clean_answer && v.physically_valid;
    if (!ok) {
      failures.push({
        file,
        rule: "validation_gate",
        message: `${file}: status=${String(pr.status)} だが検証4項目が揃っていません`,
      });
    }
  }

  // original 以外は citation 必須（schema 済だが二重チェック）
  const src = pr.source as Record<string, unknown> | undefined;
  if (src && src.type !== "original" && !src.citation) {
    failures.push({
      file,
      rule: "citation_required",
      message: `${file}: source.type=${String(src.type)} は citation 必須です`,
    });
  }

  return failures;
}

/** ファイルリストと validate 関数を受け取り失敗一覧を返す純関数（テスト可能）。 */
export function validateFiles(
  files: string[],
  dataDir: string,
  validate: (data: unknown) => boolean,
  getErrors: () => Array<{ instancePath: string; message?: string }>,
): Failure[] {
  const failures: Failure[] = [];
  for (const f of files) {
    const full = join(dataDir, f);
    let data: unknown;
    try {
      data = JSON.parse(readFileSync(full, "utf8"));
    } catch (e) {
      failures.push({
        file: full,
        rule: "json_parse",
        message: `${full}: ${String(e)}`,
      });
      continue;
    }
    const items = Array.isArray(data) ? (data as unknown[]) : [data];
    items.forEach((p, idx) => {
      const label = Array.isArray(data) ? `${full}[${idx}]` : full;
      if (!validate(p)) {
        for (const err of getErrors()) {
          failures.push({
            file: label,
            rule: "schema",
            message: `${label}: ${err.instancePath} ${err.message ?? ""}`,
          });
        }
      }
      failures.push(...customChecks(label, p));
    });
  }
  return failures;
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    printHelp(HELP);
  }

  const schema = JSON.parse(readFileSync(SCHEMA_PATH, "utf8"));
  // schema の構造不備も CI で検出する
  const ajv = new Ajv({ allErrors: true, strict: true });
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

  // 出荷済みデータの大量削除を機械的に止める下限ゲート（length===0 だけでは51件削除を見逃す）。
  // 新規データ追加で増えるのは歓迎、下回る場合は意図的な削除であることをPRで説明すること。
  const EXPECTED_MIN_FILES = 52;
  if (files.length < EXPECTED_MIN_FILES) {
    console.error(
      `問題ファイルが ${files.length} 件で下限 ${EXPECTED_MIN_FILES} を下回ります。意図的な削除なら scripts/validate-problems.ts の EXPECTED_MIN_FILES を更新してください。`,
    );
    process.exit(1);
  }

  const failures = validateFiles(files, DATA_DIR, validate, () => validate.errors ?? []);

  const errorMessages = failures.map((fl) => `[${fl.rule}] ${fl.message}`);
  validateOrExit(errorMessages, "問題データ検証");

  console.log(`✅ ${files.length} ファイルの問題データが problem-schema.json を通過しました。`);
}

main();
