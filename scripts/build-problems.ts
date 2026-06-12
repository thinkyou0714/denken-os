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
 * 使い方:
 *   npm run build:problems              （既定で web/problems.json を上書き）
 *   npm run build:problems -- --per-topic 5
 *   npm run build:problems -- --help
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generate } from "../lib/engine/generate.js";
import { StubNarrator } from "../lib/engine/narrate.js";
import type { Problem } from "../lib/engine/schema.js";
import { getTemplate, listTopics } from "../lib/engine/templates/index.js";
import { validateProblem } from "../lib/engine/validate.js";
// G3 が lib/shared/rng.ts を新設予定。同一 xorshift 出力を保証。
import { hashSeed, seededRng } from "../lib/shared/rng.js";
import { atomicWriteFileSync, printHelp, validateOrExit } from "./shared.js";

const HELP = `\
build-problems — web/problems.json を全テンプレートから決定論的に生成する

使い方:
  npm run build:problems [-- オプション]

オプション:
  --per-topic <n>  topic ごとの採用問題数（既定: 10）
  --help, -h       このヘルプを表示して終了

例:
  npm run build:problems
  npm run build:problems -- --per-topic 5
`;

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** 係数の値だけを並べた署名（キー順固定）。 */
function paramsSignature(p: Problem): string {
  const params = p.params ?? {};
  // Object.keys(params) で取得したキーは params 内に必ず存在する。
  return Object.keys(params)
    .sort()
    .map((k) => `${k}=${(params[k] as { value: number }).value}`)
    .join("|");
}

async function buildForTopic(topic: string, perTopic: number): Promise<Problem[]> {
  const template = getTemplate(topic);
  if (!template) return [];
  // 多めに生成 → statement 重複を除去 → 上限まで採用（綺麗な draw の枯渇に強い）。
  const candidates = await generate(template, {
    count: perTopic * 6,
    narrator: new StubNarrator(),
    rng: seededRng(hashSeed(topic)),
    idPrefix: "TMP",
  });
  const seen = new Set<string>();
  const seenParams = new Set<string>();
  const unique: Problem[] = [];
  for (const p of candidates) {
    if (seen.has(p.statement)) continue;
    // 係数署名でも重複除去（文面が違っても数値が同一の実質重複を排除）。
    const sig = paramsSignature(p);
    if (seenParams.has(sig)) continue;
    seen.add(p.statement);
    seenParams.add(sig);
    unique.push(p);
    if (unique.length >= perTopic) break;
  }
  return unique;
}

/** 旧・連番ID時代（mainに出荷済みの405問）の署名→ID対応。
 *  既存ユーザーの解答ログ・間違いノート（problemId参照）を壊さないため、
 *  内容が同一の問題には出荷済みのIDをそのまま使い続ける（Codexレビュー対応）。 */
const LEGACY_IDS: Record<string, string> = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), "legacy-ids.json"), "utf8"),
) as Record<string, string>;

function stableId(p: Problem, taken: Set<string>): string {
  const base = `${p.topic}|${paramsSignature(p)}`;
  const legacy = LEGACY_IDS[base];
  if (legacy && !taken.has(legacy)) {
    taken.add(legacy);
    return legacy;
  }
  let h = hashSeed(base);
  let id = `G-${h.toString(16).padStart(8, "0").toUpperCase()}`;
  // 万一の衝突は再ハッシュで回避（決定論を保つ）。
  while (taken.has(id)) {
    h = hashSeed(`${base}#${h}`);
    id = `G-${h.toString(16).padStart(8, "0").toUpperCase()}`;
  }
  taken.add(id);
  return id;
}

/** CLI 引数をパースする純関数（テスト可能）。 */
export function parseCliOptions(argv: string[]): { perTopic: number } {
  if (argv.includes("--help") || argv.includes("-h")) {
    printHelp(HELP);
  }
  let perTopic = 10;
  const idx = argv.indexOf("--per-topic");
  if (idx >= 0) {
    const val = argv[idx + 1];
    if (!val || !/^\d+$/.test(val) || Number(val) < 1) {
      process.stderr.write(`エラー: --per-topic には正の整数を指定してください\n`);
      process.exit(1);
    }
    perTopic = Number(val);
  }
  return { perTopic };
}

async function main(): Promise<void> {
  const { perTopic } = parseCliOptions(process.argv.slice(2));

  const all: Problem[] = [];
  for (const topic of listTopics()) {
    const items = await buildForTopic(topic, perTopic);
    all.push(...items);
  }

  // ID は内容由来の安定ハッシュ（テンプレ追加・並び替えでIDがズレて
  // 既存ユーザーの間違いノートが別問題を指す事故を構造的に防ぐ）。
  const taken = new Set<string>();
  const problems = all.map((p) => ({ ...p, id: stableId(p, taken) }));

  // 念のため全件 validate（壊れた問題を web に出さない）。
  const errors: string[] = [];
  for (const p of problems) {
    const r = validateProblem(p);
    if (!r.ok) {
      errors.push(`${p.id} (${p.topic}) — ${r.issues.map((i) => i.message).join("; ")}`);
    }
  }
  validateOrExit(errors, "生成問題の検証");

  const out = join(ROOT, "web", "problems.json");
  atomicWriteFileSync(out, `${JSON.stringify(problems, null, 2)}\n`);

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
  // 科目×形式マトリクス（在庫の偏りを毎回可視化し、ドキュメント乖離の再発を防ぐ）。
  const bySubject = new Map<string, Record<string, number>>();
  for (const p of problems) {
    const row = bySubject.get(p.subject) ?? {};
    const f = p.format ?? "multiple_choice";
    row[f] = (row[f] ?? 0) + 1;
    row.total = (row.total ?? 0) + 1;
    bySubject.set(p.subject, row);
  }
  for (const [subject, row] of bySubject) {
    console.log(
      `  ${subject}: 計${row.total} (mc=${row.multiple_choice ?? 0}, num=${row.numeric ?? 0}, desc=${row.descriptive ?? 0})`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
