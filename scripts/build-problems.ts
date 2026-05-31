/**
 * build-problems.ts — オフライン学習アプリ用の web/problems.json を全テンプレから生成する。
 *
 * 設計:
 *  - LLM を使わず StubNarrator（既定の問題文・解法）で決定論生成 → API キー不要・再現可能。
 *  - 全登録 topic を N 問ずつ生成し、誤答解説・ヒント・公式・想定時間・認知レベルを含む
 *    リッチな problems.json を出力する（UI がそのまま描画できる）。
 *  - 正解はコードで算出済み（solver_checked）。status は draft（未監修デモ）。
 *
 *   npm run build:problems            # 既定 N=3
 *   npm run build:problems -- --count 5 --seed 42
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generate } from "../lib/engine/generate.js";
import { StubNarrator } from "../lib/engine/narrate.js";
import type { Problem } from "../lib/engine/schema.js";
import { getTemplate, listTopics } from "../lib/engine/templates/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

function seededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function argNum(flag: string, def: number): number {
  const i = process.argv.indexOf(flag);
  if (i >= 0 && process.argv[i + 1]) {
    const n = Number(process.argv[i + 1]);
    if (Number.isFinite(n)) return n;
  }
  return def;
}

async function main() {
  const perTopic = argNum("--count", 3);
  const seed = argNum("--seed", 20260601);
  const narrator = new StubNarrator();
  const topics = listTopics().sort((a, b) => a.localeCompare(b, "ja"));

  const all: Problem[] = [];
  let index = 1;
  for (const topic of topics) {
    const tmpl = getTemplate(topic)!;
    const ps = await generate(tmpl, {
      count: perTopic,
      narrator,
      rng: seededRng(seed + index),
      idPrefix: "D",
      startIndex: index,
    });
    all.push(...ps);
    index += ps.length;
  }

  const out = join(ROOT, "web/problems.json");
  writeFileSync(out, `${JSON.stringify(all, null, 2)}\n`, "utf8");
  const withExpl = all.filter((p) => p.choice_explanations && p.choice_explanations.length > 0).length;
  const withHints = all.filter((p) => p.hints && p.hints.length > 0).length;
  console.error(
    `web/problems.json: ${all.length} 問 / ${topics.length} 論点（誤答解説 ${withExpl} / ヒント ${withHints}）を出力しました。`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
