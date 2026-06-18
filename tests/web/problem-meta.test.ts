import { describe, expect, it } from "vitest";
import type { Problem } from "../../lib/engine/schema.js";
import { isUnsupervised } from "../../web/src/problem-meta.js";

function prob(over: Partial<Problem> = {}): Problem {
  return {
    id: "X",
    subject: "理論",
    topic: "t",
    difficulty: 2,
    statement: "s",
    answer: "1",
    solution: ["x"],
    validation: { solver_checked: true, human_checked: false, clean_answer: true, physically_valid: true },
    source: { type: "original" },
    ...over,
  } as Problem;
}

describe("isUnsupervised（未監修バッジ判定・#63）", () => {
  it("draft かつ人手未検証は未監修", () => {
    expect(isUnsupervised(prob({ status: "draft" }))).toBe(true);
  });

  it("status 未設定（既定 draft 相当）も未監修", () => {
    expect(isUnsupervised(prob())).toBe(true);
  });

  it("published かつ human_checked なら監修済み（バッジ無し）", () => {
    const p = prob({
      status: "published",
      validation: { solver_checked: true, human_checked: true, clean_answer: true, physically_valid: true },
    });
    expect(isUnsupervised(p)).toBe(false);
  });

  it("validated かつ supervisor_checked でも監修済みとみなす", () => {
    const p = prob({
      status: "validated",
      validation: {
        solver_checked: true,
        human_checked: false,
        supervisor_checked: true,
        clean_answer: true,
        physically_valid: true,
      },
    });
    expect(isUnsupervised(p)).toBe(false);
  });

  it("published でも人手未検証なら未監修（ステータスだけでは監修済みにしない）", () => {
    expect(isUnsupervised(prob({ status: "published" }))).toBe(true);
  });
});
