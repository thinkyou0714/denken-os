/**
 * cli-args.test.ts — CLI 引数パーサの堅牢化テスト（II-124〜II-127）。
 *
 * parseArgs / argErrors / makeRng / readVersion の 20+ ケース。
 * 既存の tests/engine/cli.test.ts を変更せず、ここに追加テストを集約する。
 */
import { describe, expect, it } from "vitest";
import { argErrors, makeRng, parseArgs, readVersion } from "../../lib/engine/cli.js";

// ---------------------------------------------------------------------------
// II-124: 引数パーサ堅牢化
// ---------------------------------------------------------------------------
describe("parseArgs — 短縮形フラグ", () => {
  it("-t は --topic の短縮形として認識される", () => {
    const a = parseArgs(["-t", "三相交流電力"]);
    expect(a.topic).toBe("三相交流電力");
  });

  it("-h は --help の短縮形として認識される", () => {
    const a = parseArgs(["-h"]);
    expect(a.help).toBe(true);
  });

  it("-v は --version の短縮形として認識される", () => {
    const a = parseArgs(["-v"]);
    expect(a.version).toBe(true);
  });
});

describe("parseArgs — --topic の空/欠落ケース", () => {
  it("--topic の直後に別オプション(--count)が来ても topic は undefined のまま", () => {
    // '--count' はオプションライクなので next() が undefined を返す → topic 未設定
    const a = parseArgs(["--topic", "--count", "5"]);
    expect(a.topic).toBeUndefined();
    // --count は次トークンとして読まれず、5 が count として解釈される
    // NOTE: '--count' が isOptionLike で弾かれるため count は NaN になる場合あり
    // ここでは topic が undefined であることのみ確認
  });

  it("-t の直後に別オプション(-h)が来ても topic は undefined のまま", () => {
    const a = parseArgs(["-t", "-h"]);
    expect(a.topic).toBeUndefined();
    expect(a.help).toBe(true);
  });
});

describe("parseArgs — 未知オプションの警告", () => {
  it("未知オプションを渡しても例外は出ず parse は完了する", () => {
    expect(() => parseArgs(["--unknown-flag", "--topic", "三相交流電力"])).not.toThrow();
  });

  it("未知オプション後の既知オプションも正しく解釈される", () => {
    const a = parseArgs(["--foo", "--count", "7"]);
    expect(a.count).toBe(7);
  });
});

describe("parseArgs — 新フラグ", () => {
  it("--version フラグ", () => {
    const a = parseArgs(["--version"]);
    expect(a.version).toBe(true);
  });

  it("--xpost-limit フラグ", () => {
    const a = parseArgs(["--xpost-limit", "3"]);
    expect(a.xpostLimit).toBe(3);
  });

  it("--xpost-out フラグ", () => {
    const a = parseArgs(["--xpost-out", "/tmp/xpost.txt"]);
    expect(a.xpostOut).toBe("/tmp/xpost.txt");
  });

  it("既定 xpostLimit は 10", () => {
    const a = parseArgs([]);
    expect(a.xpostLimit).toBe(10);
  });

  it("既定 version は false", () => {
    const a = parseArgs([]);
    expect(a.version).toBe(false);
  });

  it("既定 xpostOut は undefined", () => {
    const a = parseArgs([]);
    expect(a.xpostOut).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// II-124: argErrors の堅牢化
// ---------------------------------------------------------------------------
describe("argErrors — xpost-limit 検証", () => {
  it("xpostLimit が 0 のときエラー", () => {
    const a = parseArgs(["--xpost-limit", "0"]);
    expect(argErrors(a).join()).toContain("--xpost-limit");
  });

  it("xpostLimit が 1 のときエラーなし", () => {
    const a = parseArgs(["--topic", "三相交流電力", "--xpost-limit", "1"]);
    expect(argErrors(a)).toEqual([]);
  });

  it("xpostLimit が NaN のときエラー（非整数文字列）", () => {
    const a = parseArgs(["--xpost-limit", "abc"]);
    expect(argErrors(a).join()).toContain("--xpost-limit");
  });
});

describe("argErrors — 既存検証の継続", () => {
  it("count が小数点のときエラー", () => {
    const a = parseArgs(["--count", "2.5"]);
    expect(argErrors(a).join()).toContain("--count");
  });

  it("count が負のときエラー", () => {
    const a = parseArgs(["--count", "-1"]);
    expect(argErrors(a).join()).toContain("--count");
  });

  it("source が不正なときエラー", () => {
    const a = parseArgs(["--source", "unknown_type"]);
    expect(argErrors(a).join()).toContain("--source");
  });

  it("seed が Infinity のときエラー（isFinite チェック）", () => {
    // '--seed Infinity' は Number('Infinity') = Infinity になりエラー
    const a = parseArgs(["--seed", "Infinity"]);
    expect(argErrors(a).join()).toContain("--seed");
  });
});

// ---------------------------------------------------------------------------
// II-127: --version / readVersion
// ---------------------------------------------------------------------------
describe("readVersion", () => {
  it("バージョン文字列がセマンティックバージョン形式（X.Y.Z）", () => {
    const v = readVersion();
    expect(v).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("'unknown' ではない（package.json が正常に読める）", () => {
    expect(readVersion()).not.toBe("unknown");
  });
});

// ---------------------------------------------------------------------------
// makeRng — 追加境界テスト
// ---------------------------------------------------------------------------
describe("makeRng — 追加ケース", () => {
  it("seed=0 でも動作する（ゼロ境界）", () => {
    const rng = makeRng(0)!;
    expect(rng()).toBeGreaterThanOrEqual(0);
    expect(rng()).toBeLessThan(1);
  });

  it("seed=0xffffffff（最大unsigned 32bit）でも動作", () => {
    const rng = makeRng(0xffffffff)!;
    expect(rng()).toBeGreaterThanOrEqual(0);
    expect(rng()).toBeLessThan(1);
  });

  it("同一 seed での 10 回シーケンスが再現する", () => {
    const a = makeRng(999)!;
    const b = makeRng(999)!;
    const seqA = Array.from({ length: 10 }, () => a());
    const seqB = Array.from({ length: 10 }, () => b());
    expect(seqA).toEqual(seqB);
  });
});
