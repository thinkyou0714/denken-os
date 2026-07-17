/**
 * tests/scripts/problems-io.test.ts — readValidProblems の recovery 挙動。
 * supervision:status / supervision:packet の入力経路。1 ファイルの JSON 破損で
 * ツール全体がクラッシュしない（警告スキップ）ことを固定する。
 */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readValidProblems } from "../../scripts/problems-io.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE = join(__dirname, "../../data/problems/T-0001.json");

describe("readValidProblems（scripts/problems-io.ts）", () => {
  // mkdtempSync でユニークな一時ディレクトリを作る（予測可能パスへの書き込みを避ける。
  // tests/store/file-store.test.ts と同じ安全な流儀）。
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "denken-problems-io-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("schema 妥当な問題を読み込み、JSON 破損ファイルは警告スキップする", () => {
    writeFileSync(join(dir, "T-0001.json"), readFileSync(FIXTURE, "utf8"), "utf8");
    writeFileSync(join(dir, "broken.json"), "{oops", "utf8");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const problems = readValidProblems(dir);
      expect(problems.map((p) => p.id)).toEqual(["T-0001"]);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("broken.json"));
    } finally {
      warn.mockRestore();
    }
  });

  it("schema 違反のファイルは黙って除外する（従来挙動）", () => {
    writeFileSync(join(dir, "bad.json"), JSON.stringify({ id: "X" }), "utf8");
    expect(readValidProblems(dir)).toEqual([]);
  });
});
