#!/usr/bin/env tsx
/**
 * supervision-mark.ts — 監修済みフラグ（supervisor_checked）を安全に立てる。
 *
 * 合格者がレビューパケットで検算・確認し「監修合格」と判断した問題に対して、
 * data/problems/<id>.json の `validation.supervisor_checked` を true に更新する。
 * 整形を壊さないよう対象キーの値だけを置換する（他フィールドは不変）。
 *
 * ⚠️ このフラグは「人間が監修した」という主張であり、本スクリプトの実行者（=合格者）が
 *    その責任を負う。コードは監修の中身を判定しない（手作業の置換を安全・冪等にするだけ）。
 *
 * 使い方:
 *   npm run supervision:mark -- T-0001 [T-0002 ...]
 *   npm run supervision:mark -- --help
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { safeMarkSupervised } from "../lib/audit/supervision.js";
import { atomicWriteFileSync, printHelp } from "./shared.js";

const HELP = `\
supervision-mark — 監修済みフラグ(supervisor_checked)を true にする

使い方:
  npm run supervision:mark -- <id> [<id> ...]

例:
  npm run supervision:mark -- T-0001 T-0002

オプション:
  --help, -h  このヘルプを表示して終了

注意:
  このフラグは「人間（電験合格者）が監修した」という主張です。実行者が責任を負います。
`;

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "../data/problems");

/** 問題ID の形式（パストラバーサル防止）。例: T-0001 */
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9-]*$/;

function main(): void {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) printHelp(HELP);

  // 信頼フラグを誤って立てないよう、不明なオプションは1件でも書込前に拒否する
  // （例: `--dry-run T-0001` の打ち間違いが黙って T-0001 を監修済みにするのを防ぐ）。
  const unknownFlags = argv.filter((a) => a.startsWith("-"));
  if (unknownFlags.length > 0) {
    console.error(
      `不明なオプションです: ${unknownFlags.join(", ")}。このコマンドは --help 以外のフラグを受け付けません（id のみ指定）。`,
    );
    process.exit(1);
  }

  const ids = argv;
  if (ids.length === 0) {
    console.error("監修対象の問題IDを1つ以上指定してください（例: npm run supervision:mark -- T-0001）。");
    process.exit(1);
  }

  let marked = 0;
  let failed = 0;
  for (const id of ids) {
    if (!ID_RE.test(id)) {
      console.error(`✗ ${id}: 不正なID形式です（[A-Za-z0-9-] のみ）。`);
      failed++;
      continue;
    }
    const path = join(DATA_DIR, `${id}.json`);
    if (!existsSync(path)) {
      console.error(`✗ ${id}: ファイルが見つかりません（${path}）。`);
      failed++;
      continue;
    }
    const before = readFileSync(path, "utf8");
    const result = safeMarkSupervised(before);
    if (result.outcome === "marked") {
      atomicWriteFileSync(path, result.text);
      console.log(`✓ ${id}: supervisor_checked = true に更新しました。`);
      marked++;
    } else if (result.outcome === "already_supervised") {
      console.log(`= ${id}: 既に監修済み（変更なし）。`);
    } else if (result.outcome === "not_validated") {
      console.error(`✗ ${id}: 未検証（validated でない）ため監修対象外です。先に検証4項目を満たしてください。`);
      failed++;
    } else {
      console.error(`✗ ${id}: JSON/スキーマが不正で監修フラグを更新できません。`);
      failed++;
    }
  }

  console.log(`\n監修フラグ更新: ${marked} 件 / 失敗 ${failed} 件`);
  if (failed > 0) process.exit(1);
}

main();
