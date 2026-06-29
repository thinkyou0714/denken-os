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
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { problemSchema } from "../lib/engine/schema.js";
import { checkProblemInvariants } from "../lib/engine/validate.js";
import { listJsonFiles, readProblemJsonItems } from "./problems-io.js";
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function recordAt(record: Record<string, unknown>, key: string): Record<string, unknown> | undefined {
  const value = record[key];
  return isRecord(value) ? value : undefined;
}

/** カスタム検証ルール（pure function, テスト可能）。 */
export function customChecks(file: string, p: unknown): Failure[] {
  const failures: Failure[] = [];
  const pr = isRecord(p) ? p : {};

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
    const v = recordAt(pr, "validation") ?? {};
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
  const src = recordAt(pr, "source");
  if (src && src.type !== "original" && !src.citation) {
    failures.push({
      file,
      rule: "citation_required",
      message: `${file}: source.type=${String(src.type)} は citation 必須です`,
    });
  }

  return failures;
}

/**
 * 出荷済みデータの大量削除を機械的に止める下限ゲート（length===0 だけでは51件削除を見逃す）。
 * 新規データ追加で増えるのは歓迎、下回る場合は意図的な削除であることをPRで説明すること。
 */
export const EXPECTED_MIN_FILES = 52;

/**
 * 問題ファイル数が下限を満たすか判定する純関数（テスト可能）。
 * 下回る場合はCIを止めるためのエラーメッセージを、満たす場合は null を返す。
 */
export function minFilesGate(fileCount: number, min = EXPECTED_MIN_FILES): string | null {
  if (fileCount < min) {
    return `問題ファイルが ${fileCount} 件で下限 ${min} を下回ります。意図的な削除なら scripts/validate-problems.ts の EXPECTED_MIN_FILES を更新してください。`;
  }
  return null;
}

/** ファイルリストと validate 関数を受け取り失敗一覧を返す純関数（テスト可能）。 */
export function validateFiles(
  files: string[],
  dataDir: string,
  validate: (data: unknown) => boolean,
  getErrors: () => Array<{ instancePath: string; message?: string }>,
): Failure[] {
  const failures: Failure[] = [];
  if (files.length === 0) return failures;
  const selected = new Set(files);
  const { items, errors } = readProblemJsonItems(dataDir);
  const seen = new Set<string>();
  for (const error of errors) {
    seen.add(error.file);
    if (!selected.has(error.file)) continue;
    failures.push({
      file: error.path,
      rule: "json_parse",
      message: `${error.path}: ${String(error.error)}`,
    });
  }
  for (const item of items) {
    seen.add(item.file);
    if (!selected.has(item.file)) continue;
    const label = join(dataDir, item.label);
    if (!validate(item.raw)) {
      for (const err of getErrors()) {
        failures.push({
          file: label,
          rule: "schema",
          message: `${label}: ${err.instancePath} ${err.message ?? ""}`,
        });
      }
    }
    failures.push(...customChecks(label, item.raw));
  }
  for (const file of selected) {
    if (seen.has(file)) continue;
    const full = join(dataDir, file);
    try {
      JSON.parse(readFileSync(full, "utf8"));
    } catch (error) {
      failures.push({
        file: full,
        rule: "json_parse",
        message: `${full}: ${String(error)}`,
      });
    }
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
    files = listJsonFiles(DATA_DIR);
  } catch {
    console.error(`データディレクトリが見つかりません: ${DATA_DIR}`);
    process.exit(1);
    return;
  }

  if (files.length === 0) {
    console.error(`検証対象の問題JSONがありません: ${DATA_DIR}`);
    process.exit(1);
  }

  // 出荷済みデータの大量削除を機械的に止める下限ゲート（pure 関数 minFilesGate でテスト可能）。
  const minErr = minFilesGate(files.length);
  if (minErr) {
    console.error(minErr);
    process.exit(1);
  }

  const failures = validateFiles(files, DATA_DIR, validate, () => validate.errors ?? []);

  const errorMessages = failures.map((fl) => `[${fl.rule}] ${fl.message}`);
  validateOrExit(errorMessages, "問題データ検証");

  console.log(`✅ ${files.length} ファイルの問題データが problem-schema.json を通過しました。`);
}

main();
