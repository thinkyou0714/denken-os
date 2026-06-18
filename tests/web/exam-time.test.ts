import { describe, expect, it } from "vitest";
import type { Problem, Subject } from "../../lib/engine/schema.js";
import {
  EXAM_TIME_CAP_MS,
  examTimeLimitMs,
  FULL_SUBJECT_QUESTION_COUNT,
  SUBJECT_EXAM_MINUTES,
} from "../../web/src/exam.js";
import { formatElapsed, formatRemaining } from "../../web/src/format.js";

const prob = (subject: Subject, id = "p"): Problem =>
  ({
    id: `${id}-${subject}`,
    subject,
    topic: `t-${id}`,
    difficulty: 2,
    statement: "s",
    answer: "1",
    solution: ["x"],
    validation: { solver_checked: true, human_checked: false, clean_answer: true, physically_valid: true },
    source: { type: "original" },
  }) as Problem;

describe("examTimeLimitMs（本番の科目別 総試験時間を再現）", () => {
  it("単一科目フル相当はその科目の本番時間（理論=90分）", () => {
    // 理論の基準数ぶん（FULL_SUBJECT_QUESTION_COUNT）以上で本番フル。
    const n = FULL_SUBJECT_QUESTION_COUNT.理論;
    const set = Array.from({ length: n }, (_, i) => prob("理論", String(i)));
    expect(examTimeLimitMs(set)).toBe(SUBJECT_EXAM_MINUTES.理論 * 60_000);
  });

  it("部分模試（基準数未満）は本番時間を比例配分する", () => {
    // 理論を基準数の半分だけ → 90分の約半分（比例配分）。
    const half = Math.floor(FULL_SUBJECT_QUESTION_COUNT.理論 / 2);
    const set = Array.from({ length: half }, (_, i) => prob("理論", String(i)));
    const ms = examTimeLimitMs(set);
    const fullMs = SUBJECT_EXAM_MINUTES.理論 * 60_000;
    expect(ms).toBeLessThan(fullMs);
    expect(ms).toBeGreaterThan(0);
    // 概ね half/full の比率（丸め誤差を許容）。
    expect(ms / fullMs).toBeCloseTo(half / FULL_SUBJECT_QUESTION_COUNT.理論, 1);
  });

  it("複数科目は各科目の本番時間を合算する", () => {
    // 法規(65分)を基準数ぶん + 理論(90分)を基準数ぶん → 合算 155分。
    const set = [
      ...Array.from({ length: FULL_SUBJECT_QUESTION_COUNT.法規 }, (_, i) => prob("法規", `h${i}`)),
      ...Array.from({ length: FULL_SUBJECT_QUESTION_COUNT.理論 }, (_, i) => prob("理論", `r${i}`)),
    ];
    expect(examTimeLimitMs(set)).toBe((SUBJECT_EXAM_MINUTES.法規 + SUBJECT_EXAM_MINUTES.理論) * 60_000);
  });

  it("二次フル2科目の合算は上限180分でキャップされる", () => {
    const set = [
      ...Array.from({ length: FULL_SUBJECT_QUESTION_COUNT.電力管理 }, (_, i) => prob("電力管理", `d${i}`)),
      ...Array.from({ length: FULL_SUBJECT_QUESTION_COUNT.機械制御 }, (_, i) => prob("機械制御", `k${i}`)),
    ];
    // 120 + 60 = 180 = 上限ちょうど。
    expect(examTimeLimitMs(set)).toBe(EXAM_TIME_CAP_MS);
  });

  it("法規は理論より総試験時間が短い（65分 < 90分）", () => {
    expect(SUBJECT_EXAM_MINUTES.法規).toBeLessThan(SUBJECT_EXAM_MINUTES.理論);
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
