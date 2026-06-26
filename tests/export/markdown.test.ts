import { describe, expect, it } from "vitest";
import type { Problem } from "../../lib/engine/schema.js";
import { toObsidianMarkdown, toVaultFiles } from "../../lib/export/markdown.js";
import { loadProblemFixture } from "../helpers/fixtures.js";

const T0001 = loadProblemFixture("T-0001");

describe("Obsidian Markdown 書き出し", () => {
  it("frontmatter・問題文・選択肢・折り畳み解答・出典を含む", () => {
    const md = toObsidianMarkdown(T0001);
    expect(md).toMatch(/^---\n/); // frontmatter 先頭
    expect(md).toContain("id: T-0001");
    expect(md).toContain("subject: 理論");
    expect(md).toContain("① 2.56");
    expect(md).toContain("> [!answer]- 解答・解説"); // 折りたたみ callout
    expect(md).toContain("**正解: 3.2**");
    expect(md).toContain("出典: DENKEN-OS オリジナル問題");
  });

  it("vault レイアウトは subject/topic/ID.md", () => {
    const files = toVaultFiles([T0001]);
    expect(files[0]!.path).toBe("理論/三相交流電力/T-0001.md");
  });

  it("numeric 問題（選択肢なし）でも壊れない", () => {
    const numeric: Problem = {
      ...T0001,
      id: "N-0001",
      format: "numeric",
      choices: undefined,
      answer: "50",
    };
    const md = toObsidianMarkdown(numeric);
    expect(md).toContain("**正解: 50**");
    expect(md).not.toContain("①");
  });
});
