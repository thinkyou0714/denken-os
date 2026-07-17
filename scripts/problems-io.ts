/**
 * problems-io.ts — data/problems の読み込みヘルパー（無副作用・テスト可能）。
 *
 * トップレベルで実行（main）するスクリプトに同居させると import 時に副作用が走るため、
 * 読取ロジックだけを独立モジュールに切り出す。
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { type Problem, problemSchema } from "../lib/engine/schema.js";

/** data/problems の schema 妥当な問題だけを読み込む。 */
export function readValidProblems(dataDir: string): Problem[] {
  const out: Problem[] = [];
  for (const file of readdirSync(dataDir).filter((f) => f.endsWith(".json"))) {
    // JSON 破損は 1 ファイルの問題として警告スキップし、supervision:status / packet を
    // 巻き添えクラッシュさせない（audit-status.ts の readProblems と同じ recovery 方針）。
    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(join(dataDir, file), "utf8"));
    } catch (e) {
      console.warn(`problems-io: JSON 破損のためスキップ (${file}): ${e instanceof Error ? e.message : e}`);
      continue;
    }
    const r = problemSchema.safeParse(raw);
    if (r.success) out.push(r.data);
  }
  return out;
}
