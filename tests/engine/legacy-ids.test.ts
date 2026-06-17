/**
 * legacy-ids.test.ts (#92) — scripts/legacy-ids.json の整合検証。
 *
 * 目的:
 *  scripts/build-problems.ts は「内容が同一の問題には出荷済みID（連番時代のID）を
 *  使い続ける」ため、署名 `topic|paramsSignature` → 旧ID の対応表 legacy-ids.json を持つ。
 *  対応表のキー（署名）が現在のテンプレートから生成されなくなると、その旧IDは二度と
 *  割り当てられず、既存ユーザーの解答ログ・間違いノートが「存在しない問題」を指す。
 *
 * 本テストは build-problems.ts の buildForTopic と同一ロジックで全 topic の生成署名を
 * 集合化し、legacy-ids.json の全署名がそこに含まれることを確認する（＝旧IDが今も解決する）。
 * さらに ID 割り当ての決定論性（同一 seed で2回生成して署名集合が一致）も確認する。
 *
 * 重要: 意図的に廃止した署名がある場合は RETIRED_SIGNATURES に明記して除外すること
 *       （対応表からの削除も同時に行うのが望ましい）。
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { generate } from "../../lib/engine/generate.js";
import { StubNarrator } from "../../lib/engine/narrate.js";
import type { Problem } from "../../lib/engine/schema.js";
import { getTemplate, listTopics } from "../../lib/engine/templates/index.js";
import { hashSeed, seededRng } from "../helpers/rng.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../../");
const LEGACY_IDS: Record<string, string> = JSON.parse(
  readFileSync(join(ROOT, "scripts/legacy-ids.json"), "utf8"),
) as Record<string, string>;

// 意図的に廃止した署名（テンプレ仕様変更で生成されなくなったもの）はここに列挙する。
// wind-load.ts の受風面積を「直径×径間」から導出する刷新を行ったため、
// 旧 {wind_pressure, area} 署名（8件）は生成されなくなった（#72 の仕様変更）。
// これらの旧IDは廃止扱い。新パラメータ {wind_pressure, diameter, span} の問題には
// 新規の安定ハッシュIDが割り当てられる。
const RETIRED_SIGNATURES = new Set<string>([
  "風圧荷重|area=0.5|wind_pressure=2000",
  "風圧荷重|area=0.5|wind_pressure=980",
  "風圧荷重|area=1|wind_pressure=1000",
  "風圧荷重|area=1|wind_pressure=490",
  "風圧荷重|area=2|wind_pressure=2940",
  "風圧荷重|area=3|wind_pressure=1230",
  "風圧荷重|area=3|wind_pressure=490",
  "風圧荷重|area=5|wind_pressure=2940",
]);

const PER_TOPIC = 10; // build-problems.ts の既定 perTopic と一致させる。

/** build-problems.ts の paramsSignature と同一実装。 */
function paramsSignature(p: Problem): string {
  const params = p.params ?? {};
  return Object.keys(params)
    .sort()
    .map((k) => `${k}=${(params[k] as { value: number }).value}`)
    .join("|");
}

/** build-problems.ts の buildForTopic と同一ロジック（決定論的・seed 固定）。 */
async function buildForTopic(topic: string, perTopic: number): Promise<Problem[]> {
  const template = getTemplate(topic);
  if (!template) return [];
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
    const sig = paramsSignature(p);
    if (seenParams.has(sig)) continue;
    seen.add(p.statement);
    seenParams.add(sig);
    unique.push(p);
    if (unique.length >= perTopic) break;
  }
  return unique;
}

/** 全 topic を生成し、`topic|paramsSignature` の集合を返す。 */
async function generatedSignatures(): Promise<Set<string>> {
  const sigs = new Set<string>();
  for (const topic of listTopics()) {
    const items = await buildForTopic(topic, PER_TOPIC);
    for (const p of items) sigs.add(`${p.topic}|${paramsSignature(p)}`);
  }
  return sigs;
}

describe("legacy-ids.json の整合（#92）", () => {
  it("対応表は405件以上（出荷済みIDの取り違え/欠落の回帰防止）", () => {
    expect(Object.keys(LEGACY_IDS).length).toBeGreaterThanOrEqual(405);
  });

  it("旧IDの割り当て先（IDの値）は一意である", () => {
    const ids = Object.values(LEGACY_IDS);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("legacy-ids.json の全署名が現在の生成物から解決する（廃止分を除く）", async () => {
    const generated = await generatedSignatures();
    const unresolved = Object.keys(LEGACY_IDS)
      .filter((sig) => !RETIRED_SIGNATURES.has(sig))
      .filter((sig) => !generated.has(sig));
    expect(
      unresolved,
      `次の旧署名が現在のテンプレートから生成されません（旧IDが解決不能）。\n` +
        `テンプレ仕様を変えたなら legacy-ids.json から該当エントリを削除し、\n` +
        `意図的な廃止なら RETIRED_SIGNATURES に追記してください:\n  ${unresolved.join("\n  ")}`,
    ).toEqual([]);
  });

  it("ID割り当ては決定論的（同一seedで2回生成した署名集合が一致）", async () => {
    const a = await generatedSignatures();
    const b = await generatedSignatures();
    expect([...a].sort()).toEqual([...b].sort());
  });
});
