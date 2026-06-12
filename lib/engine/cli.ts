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
import { pathToFileURL } from "node:url";
import { generate } from "./generate.js";
import type { SourceType } from "./schema.js";
import { getTemplate, listTopics } from "./templates/index.js";
import { buildXPosts } from "./xpost/index.js";

export interface Args {
  topic?: string;
  count: number;
  source: SourceType;
  citation?: string;
  out?: string;
  xpost: boolean;
  seed?: number;
  help: boolean;
}

const SOURCE_TYPES: readonly SourceType[] = ["original", "past_exam_modified", "past_exam_quoted"];

export function parseArgs(argv: string[]): Args {
  const args: Args = { count: 5, source: "original", xpost: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      const v = argv[++i];
      return v !== undefined ? v : undefined;
    };
    switch (a) {
      case "--topic": {
        const v = next();
        if (v !== undefined) args.topic = v;
        break;
      }
      case "--count":
        args.count = Number(next());
        break;
      case "--source":
        args.source = next() as SourceType;
        break;
      case "--citation": {
        const v = next();
        if (v !== undefined) args.citation = v;
        break;
      }
      case "--out": {
        const v = next();
        if (v !== undefined) args.out = v;
        break;
      }
      case "--xpost":
        args.xpost = true;
        break;
      case "--seed":
        args.seed = Number(next());
        break;
      case "--help":
      case "-h":
        args.help = true;
        break;
      default:
        if (a?.startsWith("--")) console.warn(`未知のオプション: ${a}`);
    }
  }
  return args;
}

/** 引数の妥当性を検証し、人間可読のエラー一覧を返す（空配列なら OK）。topic の存在確認は呼び出し側。 */
export function argErrors(args: Args): string[] {
  const errs: string[] = [];
  if (!Number.isInteger(args.count) || args.count < 1 || args.count > 100_000) {
    errs.push("--count は 1〜100000 の整数で指定してください");
  }
  if (!SOURCE_TYPES.includes(args.source)) {
    errs.push(`--source が不正です: ${args.source}（${SOURCE_TYPES.join(" / ")} のいずれか）`);
  }
  if (args.source !== "original" && !args.citation) {
    errs.push("--source が original 以外のときは --citation（出典）が必須です");
  }
  if (args.seed !== undefined && !Number.isFinite(args.seed)) {
    errs.push("--seed は数値で指定してください");
  }
  return errs;
}

const USAGE = `DENKEN-OS 問題生成エンジン

使い方:
  npm run gen -- --topic <論点> [--count N] [--source <type>] [--citation <出典>]
                 [--out <path>] [--xpost] [--seed N]

オプション:
  --topic     生成する論点（必須）。引数なしで一覧表示。
  --count     生成件数（1〜100000、既定 5）。
  --source    original | past_exam_modified | past_exam_quoted（既定 original）。
  --citation  出典（original 以外で必須）。
  --out       JSON の出力先ファイル（省略時は標準出力）。
  --xpost     朝/夜の X 投稿スレッドもプレビュー表示。
  --seed      決定論 RNG のシード（再現生成用）。
  -h, --help  このヘルプを表示。`;

/** seed 付き決定論 RNG（再現性のため。mulberry32）。 */
export function makeRng(seed?: number): (() => number) | undefined {
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

  if (args.help) {
    console.log(USAGE);
    return;
  }

  if (!args.topic) {
    console.error("エラー: --topic は必須です。利用可能な topic:");
    for (const t of listTopics()) console.error(`  - ${t}`);
    process.exit(1);
  }

  const errors = argErrors(args);
  if (errors.length > 0) {
    console.error("エラー:");
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }

  const template = getTemplate(args.topic);
  if (!template) {
    console.error(`未知の topic: ${args.topic}。利用可能: ${listTopics().join(", ")}`);
    process.exit(1);
  }

  let problems: Awaited<ReturnType<typeof generate>>;
  try {
    const rng = makeRng(args.seed);
    problems = await generate(template, {
      count: args.count,
      source: args.source,
      ...(args.citation !== undefined && { citation: args.citation }),
      ...(rng !== undefined && { rng }),
    });
  } catch (e) {
    // draw/narrate/validate 段階のエラーに topic 文脈を付与（I-020）。
    console.error(`[draw/narrate/validate] topic="${args.topic}" の問題生成中にエラーが発生しました:`);
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  }

  const json = JSON.stringify(problems, null, 2);
  if (args.out) {
    try {
      mkdirSync(dirname(args.out), { recursive: true });
      writeFileSync(args.out, `${json}\n`, "utf8");
      console.error(`${problems.length} 件を ${args.out} に書き出しました。`);
    } catch (e) {
      console.error(`[write] 出力ファイル "${args.out}" への書き込みに失敗しました:`);
      console.error(e instanceof Error ? e.message : e);
      process.exit(1);
    }
  } else {
    console.log(json);
  }

  if (args.xpost) {
    console.error("\n--- X 投稿プレビュー（朝/夜スレッド） ---");
    for (const p of problems) {
      try {
        const xpostRng = makeRng(args.seed);
        const posts = buildXPosts(p, { ...(xpostRng !== undefined && { rng: xpostRng }) });
        const fmt = (thread: string[]) => thread.map((t, i) => `  [${i + 1}/${thread.length}] ${t}`).join("\n");
        console.error(`\n[${p.id}] 朝:\n${fmt(posts.morning)}\n\n[${p.id}] 夜:\n${fmt(posts.evening)}`);
      } catch (e) {
        // 投稿文面生成のエラーに topic・問題 ID の文脈を付与（I-020）。
        console.error(`[xpost] topic="${args.topic}" id="${p.id}" の投稿文面生成中にエラーが発生しました:`);
        console.error(e instanceof Error ? e.message : e);
      }
    }
  }
}

// 直接実行(`tsx lib/engine/cli.ts`)のときだけ走らせる。
// テスト等が parseArgs/argErrors/makeRng を import しても main の副作用(生成・process.exit)を出さない。
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
