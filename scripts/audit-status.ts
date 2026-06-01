#!/usr/bin/env tsx
/**
 * Repository status audit.
 *
 * This is intentionally advisory (exit 0): it turns README/status drift and
 * problem-data scarcity into a repeatable report without blocking small fixes.
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { type Problem, problemSchema } from "../lib/engine/schema.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DATA_DIR = join(ROOT, "data/problems");
const TEST_DIR = join(ROOT, "tests");

interface AuditSummary {
  problems: {
    total: number;
    validSchema: number;
    invalidSchema: number;
    byStatus: Record<string, number>;
    bySubject: Record<string, number>;
    byFormat: Record<string, number>;
    validated: number;
    supervisorChecked: number;
  };
  tests: {
    files: number;
  };
  recommendations: string[];
}

function increment(map: Record<string, number>, key: string | undefined): void {
  map[key ?? "(unset)"] = (map[key ?? "(unset)"] ?? 0) + 1;
}

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

function audit(): AuditSummary {
  const { parsed, invalid } = readProblems();
  const byStatus: Record<string, number> = {};
  const bySubject: Record<string, number> = {};
  const byFormat: Record<string, number> = {};
  let supervisorChecked = 0;

  for (const p of parsed) {
    increment(byStatus, p.status);
    increment(bySubject, p.subject);
    increment(byFormat, p.format ?? "multiple_choice");
    if (p.validation.supervisor_checked) supervisorChecked++;
  }

  const validated = parsed.filter((p) => p.status === "validated" || p.status === "published").length;
  const testFiles = walk(TEST_DIR).filter((f) => f.endsWith(".test.ts")).length;
  const recommendations: string[] = [];

  if (invalid > 0) recommendations.push(`${invalid}件の問題データがZod schemaを通過していません。`);
  if (validated < 50)
    recommendations.push(`validated/published問題は${validated}件です。まず50件を目標に増やしてください。`);
  if (supervisorChecked === 0)
    recommendations.push("監修済み問題がまだありません。公開ベータ前に監修フローを通してください。");
  if ((byFormat.descriptive ?? 0) < 10)
    recommendations.push("記述式(descriptive)が少ないため、二次試験向けに最低10件を目標にしてください。");

  return {
    problems: {
      total: parsed.length + invalid,
      validSchema: parsed.length,
      invalidSchema: invalid,
      byStatus,
      bySubject,
      byFormat,
      validated,
      supervisorChecked,
    },
    tests: { files: testFiles },
    recommendations,
  };
}

function main(): void {
  const summary = audit();
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  console.log("DENKEN-OS status audit");
  console.log(`- problems: ${summary.problems.total} total / ${summary.problems.validated} validated-or-published`);
  console.log(`- schema: ${summary.problems.validSchema} valid / ${summary.problems.invalidSchema} invalid`);
  console.log(`- subjects: ${JSON.stringify(summary.problems.bySubject)}`);
  console.log(`- formats: ${JSON.stringify(summary.problems.byFormat)}`);
  console.log(`- test files: ${summary.tests.files}`);
  if (summary.recommendations.length > 0) {
    console.log("recommendations:");
    for (const r of summary.recommendations) console.log(`- ${r}`);
  } else {
    console.log("recommendations: none");
  }
}

main();
