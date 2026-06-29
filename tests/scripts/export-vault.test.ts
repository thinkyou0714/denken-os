/**
 * I-070: export-vault.ts の純関数に対する失敗系テスト。
 *
 * G5 が export した parseOut / loadProblems を対象に、
 * デフォルト値・引数パース・存在しないディレクトリ・スキーマ違反データを検証する。
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadProblems, parseOut } from "../../scripts/export-vault.js";
import { makeProblemFixture, withTempDir } from "../helpers/fixtures.js";

describe("parseOut（I-070）", () => {
  it("--out なしはデフォルト 'out/vault' を返す", () => {
    expect(parseOut([])).toBe("out/vault");
    expect(parseOut(["--help"])).toBe("out/vault");
    expect(parseOut(["--other", "value"])).toBe("out/vault");
  });

  it("--out <dir> で指定したパスを返す", () => {
    expect(parseOut(["--out", "/tmp/my-vault"])).toBe("/tmp/my-vault");
    expect(parseOut(["--other", "--out", "custom/path"])).toBe("custom/path");
  });

  it("--out が末尾で値なしの場合はデフォルトを返す", () => {
    expect(parseOut(["--out"])).toBe("out/vault");
  });
});

describe("loadProblems（I-070）", () => {
  it("空ディレクトリでは problems=[], skipped=0", () => {
    withTempDir("denken-test-export-vault-empty", (dir) => {
      const result = loadProblems(dir);
      expect(result.problems).toHaveLength(0);
      expect(result.skipped).toBe(0);
    });
  });

  it("不正 JSON ファイルはエラーをスロー（JSON.parse 失敗）", () => {
    withTempDir("denken-test-export-vault-bad-json", (dir) => {
      writeFileSync(join(dir, "bad.json"), "{oops}", "utf8");
      // loadProblems は JSON.parse 失敗時にスローする
      expect(() => loadProblems(dir)).toThrow();
    });
  });

  it("スキーマ違反データは skipped にカウントされ problems に含まれない", () => {
    withTempDir("denken-test-export-vault-schema", (dir) => {
      // id フィールドが欠落した不正データ
      const bad = JSON.stringify({ subject: "理論", topic: "test", statement: "x" });
      writeFileSync(join(dir, "bad.json"), bad, "utf8");

      const result = loadProblems(dir);
      expect(result.problems).toHaveLength(0);
      expect(result.skipped).toBe(1);
    });
  });

  it("正常なデータは problems に含まれる", () => {
    withTempDir("denken-test-export-vault-valid", (dir) => {
      const valid = makeProblemFixture({ id: "T-9001", topic: "テスト", statement: "テスト問題" });
      writeFileSync(join(dir, "T-9001.json"), JSON.stringify(valid), "utf8");

      const result = loadProblems(dir);
      expect(result.problems).toHaveLength(1);
      expect(result.skipped).toBe(0);
      expect(result.problems[0]?.id).toBe("T-9001");
    });
  });

  it("配列形式の JSON ファイルから複数問題を読み込む", () => {
    withTempDir("denken-test-export-vault-array", (dir) => {
      const problems = [
        makeProblemFixture({ id: "T-9002", subject: "電力", difficulty: 3, answer: "1", choices: ["1", "2"] }),
        makeProblemFixture({ id: "T-9003", subject: "機械", difficulty: 2, answer: "2", choices: ["1", "2"] }),
      ];
      writeFileSync(join(dir, "multi.json"), JSON.stringify(problems), "utf8");

      const result = loadProblems(dir);
      expect(result.problems).toHaveLength(2);
      expect(result.skipped).toBe(0);
    });
  });
});
