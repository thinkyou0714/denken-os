import { describe, expect, it } from "vitest";
import type { Problem } from "../../lib/engine/schema.js";
import {
  DESCRIPTIVE_PER_PROBLEM_MS,
  EXAM_TIME_CAP_MS,
  examTimeLimitMs,
  PRIMARY_PER_PROBLEM_MS,
} from "../../web/src/exam.js";
import { formatElapsed, formatRemaining } from "../../web/src/format.js";

const prob = (format: Problem["format"]): Problem => ({
  id: `p-${format}`,
  subject: "理論",
  topic: "t",
  format,
  difficulty: 2,
  statement: "s",
  answer: "1",
  solution: ["x"],
  validation: { solver_checked: true, human_checked: false, clean_answer: true, physically_valid: true },
  source: { type: "original" },
});

describe("examTimeLimitMs（模試の制限時間）", () => {
  it("一次形式は3分/問", () => {
    expect(examTimeLimitMs([prob("multiple_choice"), prob("numeric")])).toBe(2 * PRIMARY_PER_PROBLEM_MS);
  });

  it("記述は10分/問（一次と混合なら合算）", () => {
    expect(examTimeLimitMs([prob("descriptive"), prob("multiple_choice")])).toBe(
      DESCRIPTIVE_PER_PROBLEM_MS + PRIMARY_PER_PROBLEM_MS,
    );
  });

  it("上限120分でキャップされる", () => {
    const many = Array.from({ length: 50 }, () => prob("descriptive"));
    expect(examTimeLimitMs(many)).toBe(EXAM_TIME_CAP_MS);
  });

  it("空セットは0", () => {
    expect(examTimeLimitMs([])).toBe(0);
  });
});

describe("formatElapsed / formatRemaining", () => {
  it("60秒未満は秒、以上は分秒", () => {
    expect(formatElapsed(42_000)).toBe("42秒");
    expect(formatElapsed(125_000)).toBe("2分05秒");
  });

  it("不正値・負値は0に張り付く", () => {
    expect(formatElapsed(-5)).toBe("0秒");
    expect(formatElapsed(Number.NaN)).toBe("0秒");
    expect(formatRemaining(-1)).toBe("0:00");
  });

  it("残り時間は m:ss 形式", () => {
    expect(formatRemaining(90_000)).toBe("1:30");
    expect(formatRemaining(9_000)).toBe("0:09");
  });
});
