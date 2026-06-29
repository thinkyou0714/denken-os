/**
 * tests/helpers/fixtures.ts — フィクスチャパス解決ヘルパー（I-066）。
 *
 * data/problems/ への直書きパスをテストから排除し、
 * リポジトリルートからの相対パスで一意にアドレスする。
 */
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { type Problem, problemSchema } from "../../lib/engine/schema.js";

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

/** 衝突しない一時ディレクトリを作成し、コールバック後に必ず削除する。 */
export function withTempDir<T>(prefix: string, fn: (dir: string) => T): T {
  const dir = mkdtempSync(join(tmpdir(), `${prefix}-`));
  try {
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** テスト用の schema-valid な最小問題を生成する。 */
export function makeProblemFixture(overrides: Partial<Problem> = {}): Problem {
  return problemSchema.parse({
    id: "T-9999",
    subject: "理論",
    topic: "テスト問題",
    difficulty: 2,
    format: "multiple_choice",
    statement: "テスト",
    choices: ["A", "B", "C"],
    answer: "A",
    solution: ["答えはA"],
    validation: {
      solver_checked: true,
      human_checked: false,
      clean_answer: true,
      physically_valid: true,
    },
    source: { type: "original" },
    ...overrides,
  });
}

/**
 * data/problems/{id}.json を読み込んで Problem オブジェクトを返す。
 *
 * @param id - 問題ID（例: "T-0001"）
 */
export function loadProblemFixture(id: string): Problem {
  const path = fixturePath("data", "problems", `${id}.json`);
  return problemSchema.parse(JSON.parse(readFileSync(path, "utf8")));
}
