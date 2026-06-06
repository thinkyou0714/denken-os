#!/usr/bin/env tsx
/**
 * Repository status audit.
 *
 * Default mode is advisory (exit 0): it turns README/status drift and
 * problem-data scarcity into a repeatable report without blocking small fixes.
 * Use --strict when a release gate should fail on recommendations.
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { auditStatus, formatAuditSummary, type InvalidProblemFile, parseAuditCliOptions } from "../lib/audit/status.js";
import { type Problem, problemSchema } from "../lib/engine/schema.js";

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

function readProblems(): { parsed: Problem[]; invalidFiles: InvalidProblemFile[] } {
  const parsed: Problem[] = [];
  const invalidFiles: InvalidProblemFile[] = [];
  for (const file of readdirSync(DATA_DIR).filter((f) => f.endsWith(".json"))) {
    const path = join(DATA_DIR, file);
    try {
      const raw = JSON.parse(readFileSync(path, "utf8"));
      const result = problemSchema.safeParse(raw);
      if (result.success) parsed.push(result.data);
      else
        invalidFiles.push({
          file,
          reason: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
        });
    } catch (error) {
      invalidFiles.push({ file, reason: error instanceof Error ? error.message : String(error) });
    }
  }
  return { parsed, invalidFiles };
}

function main(): void {
  const options = parseAuditCliOptions(process.argv.slice(2));
  const { parsed, invalidFiles } = readProblems();
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
