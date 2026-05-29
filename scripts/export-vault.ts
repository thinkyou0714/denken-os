/**
 * export-vault.ts — data/problems/*.json を Obsidian vault (Markdown) に書き出す。
 *   npm run export:vault -- --out out/vault
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Problem } from "../lib/engine/schema.js";
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
  for (const f of files) {
    const data = JSON.parse(readFileSync(join(DATA_DIR, f), "utf8"));
    for (const p of Array.isArray(data) ? data : [data]) problems.push(p as Problem);
  }
  const vault = toVaultFiles(problems);
  for (const v of vault) {
    const full = join(ROOT, outDir, v.path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, v.content, "utf8");
  }
  console.error(`${vault.length} 件を ${outDir} に Obsidian Markdown として書き出しました。`);
}

main();
