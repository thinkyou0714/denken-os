/**
 * syllabus-coverage.ts — シラバス被覆レポート ＆ CI 最小被覆ゲート。
 *
 * カバー済み topic = テンプレート topic ∪ data/problems の topic。
 * 科目別の被覆率を表示し、最小被覆を下回ったら exit 1（退行防止）。
 *
 *   npm run coverage:syllabus            # レポート表示＋ゲート判定
 *   npm run coverage:syllabus -- --json  # JSON 出力
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Subject } from "../lib/engine/schema.js";
import { computeCoverage } from "../lib/engine/syllabus.js";
import { listTopics } from "../lib/engine/templates/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

/** 科目別の最小カバー論点数（これを下回ると CI 失敗）。現状値から余裕をもたせた床。 */
const MIN_BY_SUBJECT: Record<Subject, number> = {
  理論: 18,
  電力: 13,
  機械: 14,
  法規: 9,
  機械制御: 3,
  電力管理: 5,
};
const MIN_TOTAL = 62;

function dataTopics(): string[] {
  const dir = join(ROOT, "data/problems");
  const out: string[] = [];
  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".json")) continue;
    try {
      const p = JSON.parse(readFileSync(join(dir, f), "utf8"));
      if (typeof p.topic === "string") out.push(p.topic);
    } catch {
      // 壊れたJSONは validate:data 側で検出するためここでは無視。
    }
  }
  return out;
}

function main() {
  const covered = new Set<string>([...listTopics(), ...dataTopics()]);
  const report = computeCoverage(covered);

  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log("===== 電験シラバス被覆レポート =====\n");
  const failures: string[] = [];
  for (const s of report.bySubject) {
    const pct = (s.ratio * 100).toFixed(0).padStart(3);
    const bar = "█".repeat(Math.round(s.ratio * 20)).padEnd(20, "·");
    console.log(`${s.subject.padEnd(5)} ${bar} ${pct}%  (${s.covered}/${s.total})`);
    const min = MIN_BY_SUBJECT[s.subject];
    if (s.covered < min) failures.push(`${s.subject}: ${s.covered} < 最小 ${min}`);
    if (s.uncovered.length > 0) {
      const high = s.uncovered.filter((u) => u.priority === "high").map((u) => u.topic);
      if (high.length > 0) console.log(`        未カバー(高優先): ${high.join(" / ")}`);
      const rest = s.uncovered.filter((u) => u.priority !== "high").map((u) => u.topic);
      if (rest.length > 0) console.log(`        未カバー(中低): ${rest.join(" / ")}`);
    }
    console.log("");
  }
  console.log(`合計: ${report.covered}/${report.total} 論点 (${(report.ratio * 100).toFixed(0)}%)`);
  if (report.covered < MIN_TOTAL) failures.push(`合計: ${report.covered} < 最小 ${MIN_TOTAL}`);

  if (failures.length > 0) {
    console.error("\n❌ 最小被覆ゲート未達:");
    for (const f of failures) console.error(`   - ${f}`);
    process.exit(1);
  }
  console.log("\n✅ 最小被覆ゲートを満たしています。");
}

main();
