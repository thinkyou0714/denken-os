#!/usr/bin/env tsx
/**
 * pastexam-coverage.ts — 「過去問20年分」の出題分野カバレッジを集計して表示する。
 *
 * 全テンプレートの `pastExam.area` メタを `pastexam-areas.ts` の正準分類と突き合わせ、
 * 科目ごとの分野カバレッジ・未カバーの頻出分野・メタ付与率をレポートする。
 * 逐語の問題文・数値は一切扱わない（出題分野メタのみ。docs/automation/04 §1）。
 *
 * 使い方:
 *   npm run coverage:pastexam
 *   npm run coverage:pastexam -- --json
 *   npm run coverage:pastexam -- --help
 */
import {
  computePastExamCoverage,
  formatCoverageReport,
  toTemplateLike,
} from "../lib/audit/pastexam-coverage.js";
import { getTemplate, listTopics } from "../lib/engine/templates/index.js";
import { printHelp } from "./shared.js";

const HELP = `\
pastexam-coverage — 過去問20年分の出題分野カバレッジを集計する

使い方:
  npm run coverage:pastexam [-- オプション]

オプション:
  --json      結果を JSON 形式で出力
  --help, -h  このヘルプを表示して終了

例:
  npm run coverage:pastexam
  npm run coverage:pastexam -- --json
`;

function main(): void {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) printHelp(HELP);

  const templates = listTopics()
    .map((topic) => getTemplate(topic))
    .filter((t): t is NonNullable<typeof t> => t !== undefined)
    .map(toTemplateLike);

  const report = computePastExamCoverage(templates);

  if (argv.includes("--json")) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return;
  }
  process.stdout.write(`${formatCoverageReport(report)}\n`);
}

main();
