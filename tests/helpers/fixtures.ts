/**
 * tests/helpers/fixtures.ts — フィクスチャパス解決ヘルパー（I-066）。
 *
 * data/problems/ への直書きパスをテストから排除し、
 * リポジトリルートからの相対パスで一意にアドレスする。
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Problem } from "../../lib/engine/schema.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
/** リポジトリルート（tests/helpers/ の2階層上）。 */
export const ROOT = join(__dirname, "../../");

/**
 * リポジトリルートからの相対パスセグメントを繋いで絶対パスを返す。
 *
 * @example
 * fixturePath("data", "problems", "T-0001.json")
 * // → "/home/user/denken-os/data/problems/T-0001.json"
 */
export function fixturePath(...segments: string[]): string {
  return join(ROOT, ...segments);
}

/**
 * data/problems/{id}.json を読み込んで Problem オブジェクトを返す。
 *
 * @param id - 問題ID（例: "T-0001"）
 */
export function loadProblemFixture(id: string): Problem {
  const path = fixturePath("data", "problems", `${id}.json`);
  return JSON.parse(readFileSync(path, "utf8")) as Problem;
}
