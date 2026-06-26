#!/usr/bin/env tsx
/**
 * supervision-packet.ts — 監修待ち問題のレビューパケット(Markdown)を書き出す。
 *
 * validated だが未監修（supervisor_checked=false）の問題を、合格者が手で検算・
 * 出典確認しやすい Markdown にまとめる。各問題に監修チェックリストと記入欄を付す。
 * 監修フラグ（supervisor_checked）を立てる作業は人間が data/problems/*.json 上で行う。
 *
 * 使い方:
 *   npm run supervision:packet                 # 標準出力へ
 *   npm run supervision:packet -- --out out/supervision-packet.md
 *   npm run supervision:packet -- --help
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { supervisionReport } from "../lib/audit/supervision.js";
import type { Problem } from "../lib/engine/schema.js";
import { toObsidianMarkdown } from "../lib/export/markdown.js";
import { readValidProblems } from "./problems-io.js";
import { atomicWriteFileSync, printHelp } from "./shared.js";

const HELP = `\
supervision-packet — 監修待ち問題のレビューパケット(Markdown)を生成する

使い方:
  npm run supervision:packet [-- オプション]

オプション:
  --out <path>  出力先ファイル（既定: 標準出力）
  --help, -h    このヘルプを表示して終了
`;

/** 監修者が各問題で確認する観点（出典・物理妥当性・引っ掛け・法改正・著作権）。 */
const CHECKLIST: readonly string[] = [
  "数値を独立に再計算し、answer と solution の各ステップが一致するか",
  "出典(source/citation)が妥当で、改題なら原典との差分が許容範囲か",
  "物理的に成立するか（力率≦1・効率≦1・ゼロ割なし・負値なし）",
  "誤答選択肢が『成立する引っ掛け』か（明らかに不成立な選択肢がないか）",
  "法規・制度は最新の改正に整合するか（古い基準を引いていないか）",
  "問題文・解説に著作権上の引き写しがないか",
];

function getOut(argv: string[]): string | undefined {
  const eq = argv.find((a) => a.startsWith("--out="));
  if (eq) return eq.slice("--out=".length);
  const i = argv.indexOf("--out");
  if (i >= 0 && i + 1 < argv.length) return argv[i + 1];
  return undefined;
}

/** 1問ぶんの監修セクション（本文＋チェックリスト＋記入欄）を組み立てる。 */
export function problemReviewSection(p: Problem): string {
  const checklist = CHECKLIST.map((c) => `- [ ] ${c}`).join("\n");
  return [
    `### ${p.id} — ${p.subject} / ${p.topic}（★${p.difficulty}・${p.format ?? "multiple_choice"}）`,
    "",
    toObsidianMarkdown(p),
    "",
    "#### 監修チェックリスト",
    checklist,
    "",
    "#### 監修者記入欄",
    "- 監修者: __________",
    "- 判定: [ ] 合格（supervisor_checked=true に更新）／[ ] 要修正",
    "- コメント: ",
    "",
    "---",
  ].join("\n");
}

/** レビューパケット全体（ヘッダ＋各問題セクション）を組み立てる。 */
export function buildPacket(problems: Problem[]): string {
  const report = supervisionReport(problems);
  const queueIds = new Set(report.reviewQueue.map((q) => q.id));
  const targets = problems.filter((p) => queueIds.has(p.id)).sort((a, b) => a.id.localeCompare(b.id));

  const header = [
    "# DENKEN-OS 監修レビューパケット",
    "",
    `監修待ち（validated・未監修）: **${report.needsSupervision} 件** / 全 ${report.total} 件`,
    `監修カバレッジ: ${report.supervised}/${report.total}（${(report.coverage * 100).toFixed(1)}%）`,
    "",
    "各問題を手で検算し、チェックリストを満たせば data/problems/<id>.json の",
    "`validation.supervisor_checked` を true に更新してください（このフラグは人間が立てます）。",
    "",
    "---",
    "",
  ].join("\n");

  if (targets.length === 0) {
    return `${header}監修待ちの問題はありません。\n`;
  }
  return `${header}${targets.map(problemReviewSection).join("\n")}\n`;
}

function main(): void {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) printHelp(HELP);

  const __dirname = dirname(fileURLToPath(import.meta.url));
  const problems = readValidProblems(join(__dirname, "../data/problems"));
  const packet = buildPacket(problems);

  const out = getOut(argv);
  if (out) {
    atomicWriteFileSync(out, packet);
    console.error(`監修レビューパケットを書き出しました: ${out}`);
  } else {
    process.stdout.write(packet);
  }
}

main();
