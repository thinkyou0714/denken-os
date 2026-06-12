/**
 * scripts/shared.ts — スクリプト共通ユーティリティ。
 *
 * - atomicWriteFileSync: tmp+rename による原子的ファイル書き込み
 * - printHelp: 使用法文字列を標準出力に表示して exit 0
 * - validateOrExit: エラー配列を受け取りゼロ件以外は stderr に出力して exit 1
 */
import { renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

/**
 * tmp ファイルに書いてから rename する原子的書き込み。
 * 書き込み途中のクラッシュで半端ファイルが残るのを防ぐ。
 */
export function atomicWriteFileSync(path: string, data: string): void {
  const tmp = `${path}.tmp`;
  try {
    writeFileSync(tmp, data, "utf8");
    renameSync(tmp, path);
  } catch (err) {
    // tmp が残っている可能性があるが、書き込み失敗なら呼び出し元へ伝播させる
    const msg = err instanceof Error ? err.message : String(err);
    const dir = dirname(path);
    if (msg.includes("EACCES") || msg.includes("EPERM")) {
      throw new Error(`書き込み権限がありません: ${path} (${msg})`);
    }
    if (msg.includes("ENOSPC")) {
      throw new Error(`ディスク容量が不足しています: ${path} (${msg})`);
    }
    throw new Error(`ファイル書き込みに失敗しました: ${path} in ${dir} (${msg})`);
  }
}

/**
 * 使用法文字列を stdout に表示して exit 0 する。
 * --help フラグ検出後に呼ぶ。
 */
export function printHelp(usage: string): never {
  process.stdout.write(`${usage}\n`);
  process.exit(0);
}

/**
 * エラー配列が1件以上あれば stderr に出力して exit 1 する。
 * @param errors エラーメッセージ文字列の配列
 * @param context 文脈ラベル（例: "問題データ検証"）
 */
export function validateOrExit(errors: string[], context: string): void {
  if (errors.length === 0) return;
  process.stderr.write(`❌ ${context}に失敗（${errors.length} 件）:\n`);
  for (const msg of errors) {
    process.stderr.write(`  - ${msg}\n`);
  }
  process.exit(1);
}
