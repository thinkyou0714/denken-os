import { describe, expect, it } from "vitest";
import { errorDetail, recoveryView } from "../../web/src/errors.js";

describe("errorDetail", () => {
  it("Error からは message を取り出す", () => {
    expect(errorDetail(new Error("boom"))).toBe("boom");
  });
  it("文字列はそのまま", () => {
    expect(errorDetail("そのまま")).toBe("そのまま");
  });
  it("オブジェクトは JSON 化", () => {
    expect(errorDetail({ code: 42 })).toBe('{"code":42}');
  });
  it("循環参照など JSON 化できない値はフォールバック", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(errorDetail(circular)).toBe("原因不明のエラー");
  });
});

describe("recoveryView", () => {
  it("安心メッセージ（学習記録は安全）と詳細を含む", () => {
    const rv = recoveryView(new Error("描画失敗"));
    expect(rv.title).toContain("問題が発生");
    expect(rv.reassurance).toContain("安全");
    expect(rv.detail).toBe("描画失敗");
  });
});
