import { describe, expect, it } from "vitest";
import { decideStatus, meetsConfidence, meetsValidationGate, type ValidationFlags } from "../../lib/engine/gate.js";
import type { Problem } from "../../lib/engine/schema.js";

const allTrue: ValidationFlags = {
  solver_checked: true,
  human_checked: true,
  clean_answer: true,
  physically_valid: true,
};

describe("meetsValidationGate", () => {
  it("4項目すべて true なら通過", () => {
    expect(meetsValidationGate(allTrue)).toBe(true);
  });

  it("どれか1つでも false なら不通過", () => {
    for (const k of Object.keys(allTrue) as (keyof ValidationFlags)[]) {
      expect(meetsValidationGate({ ...allTrue, [k]: false })).toBe(false);
    }
  });
});

describe("meetsConfidence", () => {
  const base = (confidence?: number): Problem => ({ validation: { ...allTrue, confidence } }) as unknown as Problem;

  it("閾値以上で通過、未満で不通過", () => {
    expect(meetsConfidence(base(0.9), 0.8)).toBe(true);
    expect(meetsConfidence(base(0.7), 0.8)).toBe(false);
  });

  it("confidence 未設定は 0 扱いで不通過（閾値>0）", () => {
    expect(meetsConfidence(base(undefined), 0.5)).toBe(false);
    expect(meetsConfidence(base(undefined), 0)).toBe(true);
  });
});

describe("decideStatus", () => {
  it("検証が揃わない validated/published 要求は draft に降格（fail-closed）", () => {
    const notReady = { ...allTrue, human_checked: false };
    expect(decideStatus(notReady, "validated")).toBe("draft");
    expect(decideStatus(notReady, "published")).toBe("draft");
  });

  it("検証が揃えば要求どおり昇格", () => {
    expect(decideStatus(allTrue, "validated")).toBe("validated");
    expect(decideStatus(allTrue, "published")).toBe("published");
  });

  it("draft/retracted 要求はゲートに関係なくそのまま", () => {
    expect(decideStatus(allTrue, "draft")).toBe("draft");
    expect(decideStatus({ ...allTrue, solver_checked: false }, "retracted")).toBe("retracted");
  });
});
