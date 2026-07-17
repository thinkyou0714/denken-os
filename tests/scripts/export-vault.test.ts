/**
 * I-070: export-vault.ts の純関数に対する失敗系テスト。
 *
 * G5 が export した parseOut / loadProblems を対象に、
 * デフォルト値・引数パース・存在しないディレクトリ・スキーマ違反データを検証する。
 */
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadProblems, parseOut } from "../../scripts/export-vault.js";

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
  const tmpBase = join(tmpdir(), "denken-test-export-vault");

  it("空ディレクトリでは problems=[], skipped=0", () => {
    const dir = join(tmpBase, "empty");
    mkdirSync(dir, { recursive: true });
    try {
      const result = loadProblems(dir);
      expect(result.problems).toHaveLength(0);
      expect(result.skipped).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("不正 JSON ファイルはスローせず skipped として除外する（1 ファイルの破損で全体を落とさない）", () => {
    const dir = join(tmpBase, "bad-json");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "bad.json"), "{oops}", "utf8");
    try {
      // 旧実装は JSON.parse 失敗で即スローし、正常な他ファイルの書き出しまで巻き添えにしていた。
      // スキーマ違反と同じ graceful なスキップパスに合流させる。
      const result = loadProblems(dir);
      expect(result.problems).toHaveLength(0);
      expect(result.skipped).toBe(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("スキーマ違反データは skipped にカウントされ problems に含まれない", () => {
    const dir = join(tmpBase, "schema-violation");
    mkdirSync(dir, { recursive: true });
    // id フィールドが欠落した不正データ
    const bad = JSON.stringify({ subject: "理論", topic: "test", statement: "x" });
    writeFileSync(join(dir, "bad.json"), bad, "utf8");
    try {
      const result = loadProblems(dir);
      expect(result.problems).toHaveLength(0);
      expect(result.skipped).toBe(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("正常なデータは problems に含まれる", () => {
    const dir = join(tmpBase, "valid");
    mkdirSync(dir, { recursive: true });
    const valid = JSON.stringify({
      id: "T-9001",
      subject: "理論",
      topic: "テスト",
      difficulty: 2,
      statement: "テスト問題",
      answer: "A",
      solution: ["解説"],
      validation: {
        solver_checked: true,
        human_checked: false,
        clean_answer: true,
        physically_valid: true,
      },
      source: { type: "original" },
    });
    writeFileSync(join(dir, "T-9001.json"), valid, "utf8");
    try {
      const result = loadProblems(dir);
      expect(result.problems).toHaveLength(1);
      expect(result.skipped).toBe(0);
      expect(result.problems[0]?.id).toBe("T-9001");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("配列形式の JSON ファイルから複数問題を読み込む", () => {
    const dir = join(tmpBase, "array");
    mkdirSync(dir, { recursive: true });
    const problems = [
      {
        id: "T-9002",
        subject: "電力",
        topic: "テスト",
        difficulty: 3,
        statement: "問題A",
        answer: "1",
        solution: ["解説"],
        validation: {
          solver_checked: true,
          human_checked: false,
          clean_answer: true,
          physically_valid: true,
        },
        source: { type: "original" },
      },
      {
        id: "T-9003",
        subject: "機械",
        topic: "テスト",
        difficulty: 2,
        statement: "問題B",
        answer: "2",
        solution: ["解説"],
        validation: {
          solver_checked: true,
          human_checked: false,
          clean_answer: true,
          physically_valid: true,
        },
        source: { type: "original" },
      },
    ];
    writeFileSync(join(dir, "multi.json"), JSON.stringify(problems), "utf8");
    try {
      const result = loadProblems(dir);
      expect(result.problems).toHaveLength(2);
      expect(result.skipped).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
