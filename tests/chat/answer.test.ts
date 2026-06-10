import { describe, expect, it } from "vitest";
import {
  answerLocally,
  detectIntent,
  formatEntry,
  LEGAL_DISCLAIMER,
  SUGGESTED_QUESTIONS,
} from "../../lib/chat/answer.js";
import { findEntry } from "../../lib/chat/knowledge.js";

describe("detectIntent（意図分類）", () => {
  it("あいさつ・お礼・公式照会・通常検索を分類する", () => {
    expect(detectIntent("こんにちは")).toBe("greeting");
    expect(detectIntent("ありがとう！")).toBe("thanks");
    expect(detectIntent("力率改善の公式は？")).toBe("formula");
    expect(detectIntent("%インピーダンスとは")).toBe("lookup");
  });
});

describe("answerLocally（ローカル回答の合成）", () => {
  it("用語質問: 要約・ポイント・出典付きで回答する", () => {
    const a = answerLocally("%インピーダンスとは？");
    expect(a.text).toContain("【%インピーダンス（百分率インピーダンス）】");
    expect(a.text).toContain("ポイント:");
    expect(a.citations.length).toBe(1);
    expect(a.matched[0]?.id).toBe("percent-impedance");
  });

  it("公式照会: 公式を先頭に出す", () => {
    const a = answerLocally("力率改善の公式を教えて");
    const formulaIdx = a.text.indexOf("公式:");
    const summaryIdx = a.text.indexOf("有効電力");
    expect(formulaIdx).toBeGreaterThan(-1);
    expect(formulaIdx).toBeLessThan(summaryIdx);
  });

  it("法規の質問には改正注意のディスクレーマーを自動付与する", () => {
    const a = answerLocally("接地工事のB種について");
    expect(a.text).toContain(LEGAL_DISCLAIMER);
    expect(a.citations[0]).toContain("電技解釈");
  });

  it("制度の質問にもディスクレーマーを付与する", () => {
    const a = answerLocally("電験三種の合格点は？");
    expect(a.text).toContain(LEGAL_DISCLAIMER);
  });

  it("範囲外の質問: 知ったかぶりせず、できることを案内する", () => {
    const a = answerLocally("今日の東京の天気を教えて");
    expect(a.text).toContain("見つかりませんでした");
    expect(a.citations).toEqual([]);
    expect(a.suggestions.length).toBeGreaterThan(0);
  });

  it("あいさつには案内とおすすめ質問を返す", () => {
    const a = answerLocally("こんにちは！");
    expect(a.text).toContain("電験");
    expect(a.suggestions.length).toBeGreaterThan(0);
  });

  it("お礼には短い返答", () => {
    const a = answerLocally("ありがとうございました");
    expect(a.text).toContain("どういたしまして");
  });

  it("次のおすすめ質問は関連トピックから作られる", () => {
    const a = answerLocally("%インピーダンスとは？");
    expect(a.suggestions.some((s) => s.includes("短絡"))).toBe(true);
  });

  it("複数候補があるとき「もしかして」で代替を示す", () => {
    const a = answerLocally("変圧器の効率");
    expect(a.text).toContain("もしかして:");
  });
});

describe("formatEntry（エントリ整形）", () => {
  it("公式先頭オプションで公式が冒頭に来る", () => {
    const e = findEntry("power-factor-correction")!;
    const t = formatEntry(e, { leadWithFormula: true });
    expect(t.split("\n")[1]).toContain("公式:");
  });
  it("関連トピック名が解決される", () => {
    const e = findEntry("ohm")!;
    expect(formatEntry(e)).toContain("関連: ");
  });
});

describe("SUGGESTED_QUESTIONS", () => {
  it("全ておすすめ質問がローカルで回答可能（フォールバックにならない）", () => {
    for (const q of SUGGESTED_QUESTIONS) {
      const a = answerLocally(q);
      expect(a.matched.length, q).toBeGreaterThan(0);
    }
  });
});
