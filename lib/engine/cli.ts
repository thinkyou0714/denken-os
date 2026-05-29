/**
 * cli.ts — 問題生成エンジンの入口。
 *
 * 使い方:
 *   npm run gen -- --topic 三相交流電力 --count 5
 *   npm run gen -- --topic 三相交流電力 --count 5 --xpost
 *   npm run gen -- --topic 三相交流電力 --count 100 --out out/problems.json
 *
 * 既定では ANTHROPIC_API_KEY が無ければ決定論スタブで言い回しを生成するので、
 * API キー無しでも動く。
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { generate } from "./generate.js";
import type { SourceType } from "./schema.js";
import { getTemplate, listTopics } from "./templates/index.js";
import { buildXPosts } from "./toXPost.js";

interface Args {
  topic?: string;
  count: number;
  source: SourceType;
  citation?: string;
  out?: string;
  xpost: boolean;
  seed?: number;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { count: 5, source: "original", xpost: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    switch (a) {
      case "--topic":
        args.topic = next();
        break;
      case "--count":
        args.count = Number(next());
        break;
      case "--source":
        args.source = next() as SourceType;
        break;
      case "--citation":
        args.citation = next();
        break;
      case "--out":
        args.out = next();
        break;
      case "--xpost":
        args.xpost = true;
        break;
      case "--seed":
        args.seed = Number(next());
        break;
      default:
        if (a?.startsWith("--")) console.warn(`未知のオプション: ${a}`);
    }
  }
  return args;
}

/** seed 付き決定論 RNG（再現性のため。mulberry32）。 */
function makeRng(seed?: number): (() => number) | undefined {
  if (seed === undefined) return undefined;
  let s = seed >>> 0;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.topic) {
    console.error("エラー: --topic は必須です。利用可能な topic:");
    for (const t of listTopics()) console.error(`  - ${t}`);
    process.exit(1);
  }
  const template = getTemplate(args.topic);
  if (!template) {
    console.error(`未知の topic: ${args.topic}。利用可能: ${listTopics().join(", ")}`);
    process.exit(1);
  }

  const problems = await generate(template, {
    count: args.count,
    source: args.source,
    citation: args.citation,
    rng: makeRng(args.seed),
  });

  const json = JSON.stringify(problems, null, 2);
  if (args.out) {
    mkdirSync(dirname(args.out), { recursive: true });
    writeFileSync(args.out, json + "\n", "utf8");
    console.error(`${problems.length} 件を ${args.out} に書き出しました。`);
  } else {
    console.log(json);
  }

  if (args.xpost) {
    console.error("\n--- X 投稿プレビュー（朝/夜スレッド） ---");
    for (const p of problems) {
      const posts = buildXPosts(p, { rng: makeRng(args.seed) });
      const fmt = (thread: string[]) => thread.map((t, i) => `  [${i + 1}/${thread.length}] ${t}`).join("\n");
      console.error(`\n[${p.id}] 朝:\n${fmt(posts.morning)}\n\n[${p.id}] 夜:\n${fmt(posts.evening)}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
