import { describe, expect, it } from "vitest";
import { KNOWLEDGE } from "../../lib/chat/knowledge.js";
import { bigrams, dice, normalizeQuery, retrieve } from "../../lib/chat/retrieve.js";

describe("normalizeQuery（検索向け正規化）", () => {
  it("全角→半角・小文字化・空白/約物/長音を除去する", () => {
    // 長音「ー」は コンデンサー⇔コンデンサ 等の表記ゆれ吸収のため意図的に除去する。
    expect(normalizeQuery("％インピーダンス とは？")).toBe("%インピダンスとは");
    expect(normalizeQuery("Ｖ＝ＩＲ")).toBe("vir");
  });
  it("空文字はそのまま空", () => {
    expect(normalizeQuery("  、。 ")).toBe("");
  });
});

describe("bigrams / dice", () => {
  it("2文字未満は単文字集合", () => {
    expect([...bigrams("a")]).toEqual(["a"]);
    expect(bigrams("").size).toBe(0);
  });
  it("同一文字列の dice は 1、共通なしは 0", () => {
    const a = bigrams("インピーダンス");
    expect(dice(a, a)).toBe(1);
    expect(dice(a, bigrams("こんにちは"))).toBe(0);
  });
});

describe("retrieve（ナレッジ検索）", () => {
  it("用語の完全一致がトップになる", () => {
    const hits = retrieve("%インピーダンスとは？");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]?.entry.id).toBe("percent-impedance");
  });

  it("エイリアス（%Z）でも見つかる", () => {
    const hits = retrieve("%Zって何");
    expect(hits[0]?.entry.id).toBe("percent-impedance");
  });

  it("表記ゆれ（全角・スペース）でも見つかる", () => {
    const hits = retrieve("％ インピーダンス");
    expect(hits[0]?.entry.id).toBe("percent-impedance");
  });

  it("文中の概念語でも関連エントリが上位に来る", () => {
    const hits = retrieve("誘導電動機のすべりの求め方を教えて");
    expect(hits[0]?.entry.id).toBe("induction-motor");
  });

  it("電験と無関係な質問はヒットしない（正直な範囲外検出）", () => {
    expect(retrieve("今日の東京の天気は？")).toEqual([]);
    expect(retrieve("おすすめのラーメン屋")).toEqual([]);
  });

  it("空クエリは空配列", () => {
    expect(retrieve("")).toEqual([]);
    expect(retrieve("？？")).toEqual([]);
  });

  it("k 件以内・スコア降順で返す", () => {
    const hits = retrieve("変圧器の最大効率の条件は？", KNOWLEDGE, { k: 2 });
    expect(hits.length).toBeLessThanOrEqual(2);
    for (let i = 1; i < hits.length; i++) {
      expect(hits[i - 1]!.score).toBeGreaterThanOrEqual(hits[i]!.score);
    }
    expect(hits[0]?.entry.id).toBe("transformer-efficiency");
  });
});

describe("KNOWLEDGE（ナレッジベースの整合性）", () => {
  it("id が一意である", () => {
    const ids = KNOWLEDGE.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("related の参照先がすべて実在する", () => {
    const ids = new Set(KNOWLEDGE.map((e) => e.id));
    for (const e of KNOWLEDGE) {
      for (const r of e.related) expect(ids.has(r), `${e.id} → ${r}`).toBe(true);
    }
  });

  it("全エントリが summary と出典を持つ", () => {
    for (const e of KNOWLEDGE) {
      expect(e.summary.length, e.id).toBeGreaterThan(20);
      expect(e.citation.length, e.id).toBeGreaterThan(0);
    }
  });

  it("法規エントリは出典に条文・基準名を含む", () => {
    const legal = KNOWLEDGE.filter((e) => e.category === "法規");
    expect(legal.length).toBeGreaterThan(0);
    for (const e of legal) expect(e.citation, e.id).toMatch(/電気事業法|電技|技術基準/);
  });
});
