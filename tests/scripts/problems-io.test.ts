import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { listJsonFiles, readProblemJsonItems, toProblemJsonItems } from "../../scripts/problems-io.js";
import { withTempDir } from "../helpers/fixtures.js";

describe("problems-io shared helpers", () => {
  it("JSON ファイルだけを列挙する", () => {
    withTempDir("denken-test-problems-io-list", (dir) => {
      writeFileSync(join(dir, "a.json"), "{}", "utf8");
      writeFileSync(join(dir, "note.txt"), "ignored", "utf8");
      expect(listJsonFiles(dir)).toEqual(["a.json"]);
    });
  });

  it("object JSON を 1 item、array JSON を indexed item に正規化する", () => {
    expect(toProblemJsonItems("one.json", { id: "one" })).toEqual([
      { file: "one.json", label: "one.json", raw: { id: "one" } },
    ]);
    expect(toProblemJsonItems("multi.json", [{ id: "a" }, { id: "b" }])).toEqual([
      { file: "multi.json", label: "multi.json[0]", raw: { id: "a" } },
      { file: "multi.json", label: "multi.json[1]", raw: { id: "b" } },
    ]);
  });

  it("JSON parse 成功 item と parse error を分けて返す", () => {
    withTempDir("denken-test-problems-io-read", (dir) => {
      writeFileSync(join(dir, "ok.json"), JSON.stringify([{ id: "a" }, { id: "b" }]), "utf8");
      writeFileSync(join(dir, "bad.json"), "{oops}", "utf8");

      const result = readProblemJsonItems(dir);
      expect(result.items.map((item) => item.label)).toEqual(["ok.json[0]", "ok.json[1]"]);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.file).toBe("bad.json");
    });
  });
});
