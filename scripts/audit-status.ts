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
import { type AuditThresholds, auditStatus, formatAuditSummary } from "../lib/audit/status.js";
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

function readProblems(): { parsed: Problem[]; invalid: number } {
  const parsed: Problem[] = [];
  let invalid = 0;
  for (const file of readdirSync(DATA_DIR).filter((f) => f.endsWith(".json"))) {
    const raw = JSON.parse(readFileSync(join(DATA_DIR, file), "utf8"));
    const result = problemSchema.safeParse(raw);
    if (result.success) parsed.push(result.data);
    else invalid++;
  }
  return { parsed, invalid };
}

function numberOption(name: string): number | undefined {
  const prefix = `--${name}=`;
  const raw = process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
  if (raw === undefined) return undefined;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) throw new Error(`${prefix}<non-negative-integer> を指定してください`);
  return value;
}

function thresholdsFromArgs(): Partial<AuditThresholds> {
  const thresholds: Partial<AuditThresholds> = {};
  const minValidated = numberOption("min-validated");
  const minDescriptive = numberOption("min-descriptive");
  if (minValidated !== undefined) thresholds.minValidated = minValidated;
  if (minDescriptive !== undefined) thresholds.minDescriptive = minDescriptive;
  return thresholds;
}

function main(): void {
  const { parsed, invalid } = readProblems();
  const summary = auditStatus({
    problems: parsed,
    invalidSchema: invalid,
    testFiles: walk(TEST_DIR).filter((f) => f.endsWith(".test.ts")).length,
    thresholds: thresholdsFromArgs(),
  });

  if (process.argv.includes("--json")) console.log(JSON.stringify(summary, null, 2));
  else console.log(formatAuditSummary(summary));

  if (process.argv.includes("--strict") && summary.recommendations.length > 0) process.exit(1);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
