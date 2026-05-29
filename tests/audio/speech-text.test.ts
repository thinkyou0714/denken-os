import { describe, expect, it } from "vitest";
import { toSpeech } from "../../lib/audio/speech-text.js";

describe("toSpeech — TTS 向け読み上げ正規化", () => {
  it("数字の直後の単位を読みに変換する", () => {
    expect(toSpeech("8Ω")).toBe("8オーム");
    expect(toSpeech("200V")).toBe("200ボルト");
    expect(toSpeech("60Hz")).toBe("60ヘルツ");
    expect(toSpeech("5%")).toBe("5パーセント");
    expect(toSpeech("20MVA")).toBe("20メガボルトアンペア");
    expect(toSpeech("0.1MΩ")).toBe("0.1メガオーム");
    expect(toSpeech("1710 min⁻¹")).toBe("1710毎分回転");
  });

  it("〔単位〕表記を読みに変換する", () => {
    expect(toSpeech("P〔kW〕")).toBe("P、キロワット");
    expect(toSpeech("最小値〔MΩ〕")).toBe("最小値、メガオーム");
  });

  it("演算子・記号を読みに変換する", () => {
    expect(toSpeech("150/Ig")).toBe("150わるIg");
    expect(toSpeech("Z=8+j6Ω")).toBe("Zイコール8たすジェイ6オーム");
    expect(toSpeech("cosθ")).toBe("コサインシータ");
    expect(toSpeech("√(8²+6²)")).toBe("ルート 8の2乗たす6の2乗");
  });

  it("変数名（数字が前置しない記号）は壊さない", () => {
    expect(toSpeech("V_p")).toBe("Vp"); // 下付きを素直化、単位化しない
    expect(toSpeech("RX")).toBe("RX");
  });

  it("読み上げ後に未変換の括弧・単位記号が残らない", () => {
    const out = toSpeech("三相有効電力P〔kW〕は √(R²+X²) と Z=8+j6Ω で 200V/√3");
    expect(out).not.toMatch(/[〔〕Ω]/);
    expect(out).not.toContain("kW");
  });
});
