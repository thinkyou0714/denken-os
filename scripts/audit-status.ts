#!/usr/bin/env tsx
/**
 * audit-status.ts — リポジトリのステータス監査。
 *
 * Default mode は advisory（exit 0）: README/status のズレと問題データ不足を
 * ブロックせずに繰り返し可能なレポートに変換する。
 * リリースゲートで失敗させたい場合は --strict を使う。
 *
 * 使い方:
 *   npm run audit:status
 *   npm run audit:status -- --strict
 *   npm run audit:status -- --json
 *   npm run audit:status -- --help
 */
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { auditStatus, formatAuditSummary, type InvalidProblemFile, parseAuditCliOptions } from "../lib/audit/status.js";
import { type Problem, problemSchema } from "../lib/engine/schema.js";
import { readProblemJsonItems } from "./problems-io.js";
import { printHelp } from "./shared.js";

const HELP = `\
audit-status — リポジトリの品質ステータスを監査する

使い方:
  npm run audit:status [-- オプション]

オプション:
  --strict        推奨事項があれば exit 1（リリースゲート用）
  --json          結果を JSON 形式で出力
  --help, -h      このヘルプを表示して終了

例:
  npm run audit:status
  npm run audit:status -- --strict
  npm run audit:status -- --json
  npm run audit:status:strict    # package.json の短縮形（--strict 相当）
`;

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DATA_DIR = join(ROOT, "data/problems");
const TEST_DIR = join(ROOT, "tests");

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(path));
    else out.push(path);
  }
  return out;
}

/** 問題データを読み込む純関数（テスト可能）。 */
export function readProblems(dataDir: string): { parsed: Problem[]; invalidFiles: InvalidProblemFile[] } {
  const parsed: Problem[] = [];
  const invalidFiles: InvalidProblemFile[] = [];
  const { items, errors } = readProblemJsonItems(dataDir);
  for (const error of errors) {
    invalidFiles.push({
      file: error.file,
      reason: error.error instanceof Error ? error.error.message : String(error.error),
    });
  }
  for (const item of items) {
    const result = problemSchema.safeParse(item.raw);
    if (result.success) parsed.push(result.data);
    else
      invalidFiles.push({
        file: item.label,
        reason: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      });
  }
  return { parsed, invalidFiles };
}

function main(): void {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    printHelp(HELP);
  }

  const options = parseAuditCliOptions(argv);
  const { parsed, invalidFiles } = readProblems(DATA_DIR);
  const summary = auditStatus({
    problems: parsed,
    invalidSchema: invalidFiles.length,
    invalidFiles,
    testFiles: walk(TEST_DIR).filter((f) => f.endsWith(".test.ts")).length,
    thresholds: options.thresholds,
  });

  if (options.json) console.log(JSON.stringify(summary, null, 2));
  else console.log(formatAuditSummary(summary));

  if (options.strict && !summary.okForRelease) process.exit(1);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
