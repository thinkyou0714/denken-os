/**
 * tests/shared/rng.test.ts — lib/shared/rng.ts の出力固定テスト。
 *
 * 【重要】このテストは scripts/build-problems.ts との同一性保証の基準になる。
 * G5 が scripts 側を lib/shared/rng.ts の import に置き換えた後、
 * web/problems.json の再生成結果が変わらないことをこの固定値で担保する。
 *
 * 既知 seed で先頭10値をスナップショットとして固定する。
 * アルゴリズムを変更する際は scripts/build-problems.ts も同時に更新し、
 * web/problems.json を再生成してバイト一致を確認すること。
 *
 * 固定値の生成方法: scripts/build-problems.ts の seededRng 実装（2026-06 時点）を
 * Node.js で直接実行して取得。アルゴリズムは xorshift 系 MurmurHash3 finalizer。
 */
import { describe, expect, it } from "vitest";
import { hashSeed, seededRng } from "../../lib/shared/rng.js";

/**
 * seed=1 の先頭10値（2026-06 時点の参照実装から生成）。
 */
const SEED1_EXPECTED = [
  0.6270739405881613, 0.002735721180215478, 0.5274470399599522, 0.9810509674716741, 0.9683778982143849,
  0.281103502959013, 0.6128388606011868, 0.7207431411370635, 0.425796952098608, 0.9948229456786066,
];

/**
 * seed=42 の先頭10値。
 */
const SEED42_EXPECTED = [
  0.6011037519201636, 0.44829055899754167, 0.8524657934904099, 0.6697340414393693, 0.17481389874592423,
  0.5265925421845168, 0.2732279943302274, 0.6247446539346129, 0.8654746483080089, 0.4723170551005751,
];

/**
 * seed=0 の先頭10値（境界ケース）。
 */
const SEED0_EXPECTED = [
  0.26642920868471265, 0.0003297457005828619, 0.2232720274478197, 0.1462021479383111, 0.46732782293111086,
  0.5450490827206522, 0.6152513844426721, 0.6489853798411787, 0.45600721263326705, 0.581218967679888,
];

describe("lib/shared/rng - seededRng", () => {
  it("seed=1: 先頭10値が固定値と一致する（アルゴリズム同一性の基準）", () => {
    const rng = seededRng(1);
    const actual = Array.from({ length: 10 }, () => rng());
    expect(actual).toHaveLength(10);
    for (let i = 0; i < 10; i++) {
      // 浮動小数点の丸め誤差を許容せず strict 等値比較（ビット単位同一性を保証）
      expect(actual[i]).toBe(SEED1_EXPECTED[i]);
    }
  });

  it("seed=42: 先頭10値が固定値と一致する", () => {
    const rng = seededRng(42);
    const actual = Array.from({ length: 10 }, () => rng());
    for (let i = 0; i < 10; i++) {
      expect(actual[i]).toBe(SEED42_EXPECTED[i]);
    }
  });

  it("seed=0（境界）: 先頭10値が固定値と一致する", () => {
    const rng = seededRng(0);
    const actual = Array.from({ length: 10 }, () => rng());
    for (let i = 0; i < 10; i++) {
      expect(actual[i]).toBe(SEED0_EXPECTED[i]);
    }
  });

  it("同じ seed で生成器を再作成すると同一の数列を返す（決定論）", () => {
    const a = seededRng(99);
    const b = seededRng(99);
    for (let i = 0; i < 20; i++) {
      expect(a()).toBe(b());
    }
  });

  it("異なる seed は異なる数列を返す", () => {
    const a = seededRng(1);
    const b = seededRng(2);
    const va = a();
    const vb = b();
    expect(va).not.toBe(vb);
  });

  it("全値が [0, 1) の範囲内にある", () => {
    const rng = seededRng(12345);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("seed が 32bit 符号なし整数として扱われる（>>> 0 の確認）", () => {
    // seed に負数を渡しても決定論的に動作する
    const rng = seededRng(-1);
    const v = rng();
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThan(1);
    // 再実行で同じ値
    expect(seededRng(-1)()).toBe(v);
  });
});

// I-072: hashSeed のテスト補完（G3 が新設した関数のテスト）
describe("lib/shared/rng - hashSeed", () => {
  it("同じ文字列は常に同じ seed を返す（決定論）", () => {
    expect(hashSeed("三相交流電力")).toBe(hashSeed("三相交流電力"));
    expect(hashSeed("")).toBe(hashSeed(""));
  });

  it("異なる文字列は異なる seed を返す", () => {
    expect(hashSeed("三相交流電力")).not.toBe(hashSeed("誘導電動機の回転速度"));
    expect(hashSeed("a")).not.toBe(hashSeed("b"));
  });

  it("戻り値は 32bit 符号なし整数（0 ≤ h < 2^32）", () => {
    for (const text of ["", "a", "三相交流電力", "very long string with many characters"]) {
      const h = hashSeed(text);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThan(2 ** 32);
      expect(Number.isInteger(h)).toBe(true);
    }
  });

  it("空文字列も確定値を返す（FNV-1a 初期値の >>> 0）", () => {
    // 空文字列: h=2166136261 >>> 0 = 2166136261
    expect(hashSeed("")).toBe(2166136261);
  });

  it("seededRng(hashSeed(text)) が決定論的に動作する（topic→seed→rng のパイプライン）", () => {
    const rng1 = seededRng(hashSeed("三相交流電力"));
    const rng2 = seededRng(hashSeed("三相交流電力"));
    for (let i = 0; i < 10; i++) {
      expect(rng1()).toBe(rng2());
    }
  });
});
