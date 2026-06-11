/**
 * build-problems.ts — オフライン学習アプリ用の問題セット(web/problems.json)を
 * 全テンプレートから決定論的に生成する。
 *
 * 方針:
 *  - 各 topic を seed 固定で生成 → 再実行しても同じ出力（CI/差分が安定）。
 *  - 正解はコード算出・StubNarrator（LLM不要）で数値は不変。
 *  - statement 重複は除去し、topic ごとに最大 PER_TOPIC 件を採用。
 *  - 生成物は status="draft"（未監修）。アプリ側はデモ注記を表示する。
 *
 * 使い方: npm run build:problems  （既定で web/problems.json を上書き）
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generate } from "../lib/engine/generate.js";
import { StubNarrator } from "../lib/engine/narrate.js";
import type { Problem } from "../lib/engine/schema.js";
import { getTemplate, listTopics } from "../lib/engine/templates/index.js";
import { validateProblem } from "../lib/engine/validate.js";

const PER_TOPIC = 10;
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** 決定論 RNG（テストと同じ実装）。topic ごとに別 seed を与える。 */
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

function hashSeed(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

async function buildForTopic(topic: string): Promise<Problem[]> {
  const template = getTemplate(topic);
  if (!template) return [];
  // 多めに生成 → statement 重複を除去 → 上限まで採用（綺麗な draw の枯渇に強い）。
  const candidates = await generate(template, {
    count: PER_TOPIC * 6,
    narrator: new StubNarrator(),
    rng: seededRng(hashSeed(topic)),
    idPrefix: "TMP",
  });
  const seen = new Set<string>();
  const unique: Problem[] = [];
  for (const p of candidates) {
    if (seen.has(p.statement)) continue;
    seen.add(p.statement);
    unique.push(p);
    if (unique.length >= PER_TOPIC) break;
  }
  return unique;
}

async function main(): Promise<void> {
  const all: Problem[] = [];
  for (const topic of listTopics()) {
    const items = await buildForTopic(topic);
    all.push(...items);
  }

  // ID を通し番号で振り直す（topic 順 → 安定）。
  const problems = all.map((p, i) => ({ ...p, id: `D-${String(i + 1).padStart(4, "0")}` }));

  // 念のため全件 validate（壊れた問題を web に出さない）。
  for (const p of problems) {
    const r = validateProblem(p);
    if (!r.ok) {
      throw new Error(`生成問題が検証に失敗: ${p.id} (${p.topic}) — ${r.issues.map((i) => i.message).join("; ")}`);
    }
  }

  const out = join(ROOT, "web", "problems.json");
  writeFileSync(out, `${JSON.stringify(problems, null, 2)}\n`);

  const byFormat = problems.reduce<Record<string, number>>((acc, p) => {
    const f = p.format ?? "multiple_choice";
    acc[f] = (acc[f] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`web/problems.json を生成: ${problems.length}問 / ${listTopics().length}topic`);
  console.log(
    `  形式内訳: ${Object.entries(byFormat)
      .map(([k, v]) => `${k}=${v}`)
      .join(", ")}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
