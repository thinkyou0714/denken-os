#!/usr/bin/env tsx
/**
 * supervision-status.ts — 監修（合格者レビュー）カバレッジのレポート。
 *
 * data/problems/*.json の監修進捗を集計し、科目・論点ごとのカバレッジと
 * 監修待ちキューを表示する。`validation.supervisor_checked` を立てるのは
 * 実際に監修した人間のみ。本スクリプトは進捗の可視化のみ行う。
 *
 * 使い方:
 *   npm run supervision:status
 *   npm run supervision:status -- --json
 *   npm run supervision:status -- --help
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { formatSupervisionReport, supervisionReport } from "../lib/audit/supervision.js";
import { readValidProblems } from "./problems-io.js";
import { printHelp } from "./shared.js";

const HELP = `\
supervision-status — 監修カバレッジ（合格者レビュー進捗）を表示する

使い方:
  npm run supervision:status [-- オプション]

オプション:
  --json      結果を JSON 形式で出力
  --help, -h  このヘルプを表示して終了
`;

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "../data/problems");

function main(): void {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) printHelp(HELP);

  const report = supervisionReport(readValidProblems(DATA_DIR));
  if (argv.includes("--json")) console.log(JSON.stringify(report, null, 2));
  else console.log(formatSupervisionReport(report));
}

main();
