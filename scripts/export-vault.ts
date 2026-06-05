/**
 * export-vault.ts — data/problems/*.json を Obsidian vault (Markdown) に書き出す。
 *   npm run export:vault -- --out out/vault
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Problem } from "../lib/engine/schema.js";
import { validateProblem } from "../lib/engine/validate.js";
import { toVaultFiles } from "../lib/export/markdown.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DATA_DIR = join(ROOT, "data/problems");

function parseOut(argv: string[]): string {
  const i = argv.indexOf("--out");
  return i >= 0 && argv[i + 1] ? argv[i + 1]! : "out/vault";
}

function main() {
  const outDir = parseOut(process.argv.slice(2));
  const files = readdirSync(DATA_DIR).filter((f) => f.endsWith(".json"));
  const problems: Problem[] = [];
  let skipped = 0;
  for (const f of files) {
    const data = JSON.parse(readFileSync(join(DATA_DIR, f), "utf8"));
    for (const raw of Array.isArray(data) ? data : [data]) {
      // 不正な問題（schema 違反・answer∉choices 等）は vault に書き出さない。
      const result = validateProblem(raw);
      if (result.ok && result.problem) {
        problems.push(result.problem);
      } else {
        skipped += 1;
        const id = (raw as { id?: string }).id ?? f;
        console.error(`⚠ 検証に失敗したため除外: ${id} — ${result.issues.map((i) => i.message).join("; ")}`);
      }
    }
  }
  const vault = toVaultFiles(problems);
  for (const v of vault) {
    const full = join(ROOT, outDir, v.path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, v.content, "utf8");
  }
  console.error(
    `${vault.length} 件を ${outDir} に Obsidian Markdown として書き出しました。${skipped > 0 ? `（${skipped} 件は検証失敗で除外）` : ""}`,
  );
}

main();
