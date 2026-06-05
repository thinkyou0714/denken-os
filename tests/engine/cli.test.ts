import { describe, expect, it } from "vitest";
import { argErrors, makeRng, parseArgs } from "../../lib/engine/cli.js";

describe("cli parseArgs", () => {
  it("既定値（count=5 / source=original）", () => {
    const a = parseArgs([]);
    expect(a.count).toBe(5);
    expect(a.source).toBe("original");
    expect(a.xpost).toBe(false);
    expect(a.help).toBe(false);
  });

  it("各オプションを解釈する", () => {
    const a = parseArgs([
      "--topic",
      "三相交流電力",
      "--count",
      "12",
      "--source",
      "past_exam_modified",
      "--citation",
      "令和5年度",
      "--out",
      "out/p.json",
      "--xpost",
      "--seed",
      "7",
    ]);
    expect(a.topic).toBe("三相交流電力");
    expect(a.count).toBe(12);
    expect(a.source).toBe("past_exam_modified");
    expect(a.citation).toBe("令和5年度");
    expect(a.out).toBe("out/p.json");
    expect(a.xpost).toBe(true);
    expect(a.seed).toBe(7);
  });

  it("--help / -h を拾う", () => {
    expect(parseArgs(["--help"]).help).toBe(true);
    expect(parseArgs(["-h"]).help).toBe(true);
  });
});

describe("cli argErrors", () => {
  const base = parseArgs(["--topic", "三相交流電力"]);

  it("妥当な引数はエラーなし", () => {
    expect(argErrors(base)).toEqual([]);
  });

  it("--count が NaN / 0 / 非整数 / 上限超過を弾く", () => {
    expect(argErrors(parseArgs(["--count", "abc"])).join()).toContain("--count");
    expect(argErrors(parseArgs(["--count", "0"])).join()).toContain("--count");
    expect(argErrors(parseArgs(["--count", "1.5"])).join()).toContain("--count");
    expect(argErrors(parseArgs(["--count", "999999"])).join()).toContain("--count");
  });

  it("不正な --source を弾く", () => {
    expect(argErrors(parseArgs(["--source", "bogus"])).join()).toContain("--source");
  });

  it("original 以外で --citation 欠落を弾く", () => {
    expect(argErrors(parseArgs(["--source", "past_exam_quoted"])).join()).toContain("--citation");
  });

  it("--seed が数値でなければ弾く", () => {
    expect(argErrors(parseArgs(["--seed", "x"])).join()).toContain("--seed");
  });
});

describe("cli makeRng", () => {
  it("seed なしは undefined（Math.random を使う合図）", () => {
    expect(makeRng(undefined)).toBeUndefined();
  });

  it("同じ seed は同じ系列を再現する（決定論）", () => {
    const a = makeRng(42)!;
    const b = makeRng(42)!;
    const seqA = [a(), a(), a()];
    const seqB = [b(), b(), b()];
    expect(seqA).toEqual(seqB);
    for (const x of seqA) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });

  it("異なる seed は異なる系列", () => {
    expect(makeRng(1)!()).not.toBe(makeRng(2)!());
  });
});
