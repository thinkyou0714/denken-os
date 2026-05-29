/**
 * build-problems.ts — オフライン学習アプリ用のデモ問題集 web/problems.json を
 * 登録済み**全テンプレート**から決定論的に生成する。
 *
 * 背景（根本対策）: 以前 web/problems.json は手動コミットの一度きり生成物で、
 * テンプレを増やしてもアプリへ反映されず恒久的にドリフトしていた。
 * ここでエンジンを唯一の真実とし、固定シードで再現可能に再生成する。
 *
 * 使い方: npm run gen:web   （生成後 npm run build:web でバンドル）
 * 数値の正解はコード算出・検証済み（status=draft=未監修デモ）。
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generate } from "../lib/engine/generate.js";
import { StubNarrator } from "../lib/engine/narrate.js";
import type { Problem } from "../lib/engine/schema.js";
import { getTemplate, listTopics } from "../lib/engine/templates/index.js";
import { validateProblem } from "../lib/engine/validate.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT = join(ROOT, "web/problems.json");

/** 固定シードの決定論 RNG（再現性のため。mulberry32）。 */
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

/** テンプレ名ごとに固定シードを割り当てる（並び順が変わっても安定）。 */
function topicSeed(topic: string): number {
  let h = 2166136261;
  for (let i = 0; i < topic.length; i++) {
    h ^= topic.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const PER_TEMPLATE = 4;

export async function buildProblems(): Promise<Problem[]> {
  const out: Problem[] = [];
  // listTopics() の戻り順（レジストリ登録順）で安定生成する。
  for (const topic of listTopics()) {
    const template = getTemplate(topic);
    if (!template) continue;
    const problems = await generate(template, {
      count: PER_TEMPLATE,
      narrator: new StubNarrator(),
      rng: seededRng(topicSeed(topic)),
      idPrefix: "D",
      startIndex: out.length + 1,
    });
    for (const p of problems) {
      const result = validateProblem(p);
      if (!result.ok) {
        throw new Error(`生成した ${p.id}(${topic}) が検証に失敗: ${result.issues.map((i) => i.message).join("; ")}`);
      }
      out.push(p);
    }
  }
  return out;
}

async function main() {
  const problems = await buildProblems();
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, `${JSON.stringify(problems, null, 2)}\n`, "utf8");
  const subjects = [...new Set(problems.map((p) => p.subject))];
  console.error(
    `web/problems.json を再生成しました: ${problems.length}問 / ${subjects.length}科目（${subjects.join("・")}）`,
  );
}

// 直接実行時のみ書き出す（テストからは buildProblems を import して使う）。
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
