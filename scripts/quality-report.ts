/**
 * quality-report.ts — 問題品質レポート ＆ CI サニティゲート。
 *
 * 対象:
 *  1) data/problems の監修済みバンク（重複・誤答妥当性・完全性）
 *  2) 各テンプレートが生成するサンプル（誤答が機能するか・重複しないか）
 *
 * 出力:
 *  - テンプレート別の平均/最小スコアと重複率
 *  - error 重大度の所見が 1 件でもあれば exit 1（誤答妥当性サニティ・選択肢重複・answer∉choices 等）
 *  - warn は情報表示（完全性の改善余地）
 *
 *   npm run quality:problems            # レポート＋ゲート
 *   npm run quality:problems -- --json  # JSON 出力
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generate } from "../lib/engine/generate.js";
import { StubNarrator } from "../lib/engine/narrate.js";
import { summarizeQuality } from "../lib/engine/quality.js";
import type { Problem } from "../lib/engine/schema.js";
import { getTemplate, listTopics } from "../lib/engine/templates/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SAMPLE_PER_TEMPLATE = 12;

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

function loadDataProblems(): Problem[] {
  const dir = join(ROOT, "data/problems");
  const out: Problem[] = [];
  for (const f of readdirSync(dir)) {
    if (f.endsWith(".json")) out.push(JSON.parse(readFileSync(join(dir, f), "utf8")));
  }
  return out;
}

async function main() {
  const asJson = process.argv.includes("--json");
  const data = loadDataProblems();
  const dataSummary = summarizeQuality(data);

  const perTemplate: {
    topic: string;
    avg: number;
    min: number;
    dupProblems: number;
    errors: number;
  }[] = [];
  let generatedErrors = 0;

  for (const topic of listTopics()) {
    const t = getTemplate(topic)!;
    const ps = await generate(t, { count: SAMPLE_PER_TEMPLATE, narrator: new StubNarrator(), rng: seededRng(1234) });
    const s = summarizeQuality(ps);
    generatedErrors += s.errorCount;
    perTemplate.push({
      topic,
      avg: s.avgScore,
      min: s.minScore,
      dupProblems: s.duplicateProblems,
      errors: s.errorCount,
    });
  }

  if (asJson) {
    console.log(JSON.stringify({ dataSummary, perTemplate }, null, 2));
  } else {
    console.log("===== 監修済みバンク品質 (data/problems) =====");
    console.log(
      `件数 ${dataSummary.count} / 平均スコア ${dataSummary.avgScore.toFixed(1)} / 最小 ${dataSummary.minScore} / ` +
        `error ${dataSummary.errorCount} / warn ${dataSummary.warnCount} / 重複 ${dataSummary.duplicateProblems}`,
    );
    for (const r of dataSummary.results) {
      const errs = r.findings.filter((f) => f.severity === "error");
      if (errs.length > 0) for (const e of errs) console.log(`  ❌ [${r.id}] ${e.code}: ${e.message}`);
    }

    console.log("\n===== テンプレート生成サンプルの品質 =====");
    for (const r of perTemplate.sort((a, b) => a.avg - b.avg)) {
      const flag = r.errors > 0 ? "❌" : r.dupProblems > 0 ? "△" : "✅";
      console.log(
        `${flag} ${r.topic.padEnd(24)} 平均 ${r.avg.toFixed(0).padStart(3)} / 最小 ${String(r.min).padStart(3)}` +
          `${r.dupProblems > 0 ? ` / 重複 ${r.dupProblems}` : ""}${r.errors > 0 ? ` / error ${r.errors}` : ""}`,
      );
    }
  }

  const hardErrors = dataSummary.errorCount + generatedErrors + dataSummary.duplicateProblems;
  if (hardErrors > 0) {
    console.error(
      `\n❌ 品質サニティゲート未達: data error ${dataSummary.errorCount} / data 重複 ${dataSummary.duplicateProblems} / 生成 error ${generatedErrors}`,
    );
    process.exit(1);
  }
  if (!asJson) console.log("\n✅ 品質サニティゲートを満たしています（誤答妥当性・重複なし）。");
}

main();
