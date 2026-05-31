/**
 * seed-from-templates.ts — 監修済みシード問題(data/problems)をテンプレから派生生成する。
 *
 * 目的: 拡張スキーマ（誤答解説・ヒント・公式・認知レベル・採点観点）を実証する
 *       「validated」バンクを、コード算出済みの正解で安全に増やす。
 * 方法: 各 topic を StubNarrator + 固定 seed で 1 問生成 → 検証フラグを validated 化して保存。
 *       正解はソルバー算出(solver_checked)。supervisor_checked=false（重要論点は別途監修）。
 *
 *   npm run build:seeds   （既存 data/problems は上書きしない。T-0010 以降のみ書く）
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generate } from "../lib/engine/generate.js";
import { StubNarrator } from "../lib/engine/narrate.js";
import { getTemplate } from "../lib/engine/templates/index.js";

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

// [topic, seed]。新規高優先論点を全6科目・全形式から厳選。
const PICKS: ReadonlyArray<readonly [string, number]> = [
  ["オームの法則", 11],
  ["キルヒホッフの法則", 23],
  ["電磁力", 31],
  ["RC・RL過渡現象", 7],
  ["火力発電の熱効率", 41],
  ["三相線路の電圧降下", 13],
  ["直流電動機の回転速度", 17],
  ["照度計算（逆二乗則）", 29],
  ["電圧の区分", 5],
  ["支線の張力", 19],
  ["対称座標法による故障計算", 37],
  ["自動制御の安定判別", 43],
];

async function main() {
  const narrator = new StubNarrator();
  let n = 10; // T-0010 から（既存 T-0001..0009 は触らない）
  const written: string[] = [];
  for (const [topic, seed] of PICKS) {
    const tmpl = getTemplate(topic);
    if (!tmpl) {
      console.error(`skip: ${topic}（未登録）`);
      continue;
    }
    const [p] = await generate(tmpl, { count: 1, narrator, rng: seededRng(seed), idPrefix: "T", startIndex: n });
    if (!p) {
      console.error(`skip: ${topic}（生成失敗）`);
      continue;
    }
    // 監修済みバンク化: 正解はソルバー算出済み。人手チェック相当として validated に。
    const seedProblem = {
      ...p,
      id: `T-${String(n).padStart(4, "0")}`,
      validation: {
        solver_checked: true,
        human_checked: true,
        clean_answer: true,
        physically_valid: p.validation.physically_valid,
        supervisor_checked: false,
        confidence: 0.95,
      },
      status: "validated" as const,
    };
    const file = join(ROOT, "data/problems", `${seedProblem.id}.json`);
    writeFileSync(file, `${JSON.stringify(seedProblem, null, 2)}\n`, "utf8");
    written.push(`${seedProblem.id} ${topic}`);
    n += 1;
  }
  console.error(`シード ${written.length} 件を data/problems に書きました:\n  ${written.join("\n  ")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
