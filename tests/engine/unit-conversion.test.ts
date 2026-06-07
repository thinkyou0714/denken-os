/**
 * 単位換算テンプレートの数値再現（接頭語換算ドリル）。
 * generate↔generateFrom 一致と不変条件は property/template-invariants が横断検証する。
 * ここは代表ケースの算術と E4(単位なし数値)・clean を固定で確認する。
 */
import { describe, expect, it } from "vitest";
import { unitConversion } from "../../lib/engine/templates/unit-conversion.js";

describe("単位換算テンプレート", () => {
  it("×1000 換算（2.4MW→kW=2400）を数値で算出", () => {
    const g = unitConversion.generateFrom({ value: 2.4, factor: 1000 });
    expect(g?.format).toBe("numeric");
    expect(g?.answerText).toBe("2400");
    expect(g?.choices).toBeUndefined(); // numeric は選択肢なし
  });

  it("÷1000 換算（4700Ω→kΩ=4.7）を数値で算出", () => {
    const g = unitConversion.generateFrom({ value: 4700, factor: 0.001 });
    expect(g?.answerText).toBe("4.7");
  });

  it("answer は単位なしの数値文字列（E4: Number で round-trip 可）", () => {
    const g = unitConversion.generateFrom({ value: 6.6, factor: 1000 });
    expect(Number.isFinite(Number(g?.answerText))).toBe(true);
    expect(g?.answerText).toBe("6600");
  });

  it("レンジ外の value は棄却される", () => {
    expect(unitConversion.generateFrom({ value: 1_000_000, factor: 1000 })).toBeNull();
  });

  it("generate と generateFrom が同じ答えを再現する（決定論）", () => {
    let s = 777;
    const rng = () => {
      s |= 0;
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    for (let i = 0; i < 30; i++) {
      const g = unitConversion.generate(rng);
      if (!g) continue;
      const again = unitConversion.generateFrom({ value: g.params.value!.value, factor: g.params.factor!.value });
      expect(again?.answerText).toBe(g.answerText);
      expect(again?.answerValue).toBe(g.answerValue);
    }
  });
});
