/**
 * export-vault.ts — data/problems/*.json を Obsidian vault (Markdown) に書き出す。
 *
 * 使い方:
 *   npm run export:vault -- --out out/vault
 *   npm run export:vault -- --help
 */
import { mkdirSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Problem } from "../lib/engine/schema.js";
import { validateProblem } from "../lib/engine/validate.js";
import { toVaultFiles } from "../lib/export/markdown.js";
import { atomicWriteFileSync, printHelp } from "./shared.js";

const HELP = `\
export-vault — data/problems/*.json を Obsidian vault 形式（Markdown）に書き出す

使い方:
  npm run export:vault [-- オプション]

オプション:
  --out <dir>   出力先ディレクトリ（既定: out/vault）
  --help, -h    このヘルプを表示して終了

例:
  npm run export:vault -- --out /tmp/my-vault
`;

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DATA_DIR = join(ROOT, "data/problems");

/** --out 引数をパースする純関数（テスト可能）。 */
export function parseOut(argv: string[]): string {
  const i = argv.indexOf("--out");
  return i >= 0 && argv[i + 1] ? (argv[i + 1] as string) : "out/vault";
}

/** 問題データを読み込む純関数（テスト可能）。 */
export function loadProblems(dataDir: string): { problems: Problem[]; skipped: number } {
  const files = readdirSync(dataDir).filter((f) => f.endsWith(".json"));
  const problems: Problem[] = [];
  let skipped = 0;
  for (const f of files) {
    const data = JSON.parse(readFileSync(join(dataDir, f), "utf8")) as unknown;
    for (const raw of Array.isArray(data) ? (data as unknown[]) : [data]) {
      const result = validateProblem(raw);
      if (result.ok && result.problem) {
        problems.push(result.problem);
      } else {
        skipped += 1;
        const id = (raw as { id?: string }).id ?? f;
        process.stderr.write(`⚠ 検証に失敗したため除外: ${id} — ${result.issues.map((i) => i.message).join("; ")}\n`);
      }
    }
  }
  return { problems, skipped };
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    printHelp(HELP);
  }

  const outDir = parseOut(argv);
  const { problems, skipped } = loadProblems(DATA_DIR);

  const vault = toVaultFiles(problems);
  for (const v of vault) {
    const full = join(ROOT, outDir, v.path);
    try {
      mkdirSync(dirname(full), { recursive: true });
      atomicWriteFileSync(full, v.content);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // atomicWriteFileSync が権限/容量エラーを文脈付きメッセージに変換済み
      process.stderr.write(`書き込みエラー: ${full}\n  ${msg}\n`);
      process.exit(1);
    }
  }
  process.stderr.write(
    `${vault.length} 件を ${outDir} に Obsidian Markdown として書き出しました。${skipped > 0 ? `（${skipped} 件は検証失敗で除外）` : ""}\n`,
  );
}

main();
