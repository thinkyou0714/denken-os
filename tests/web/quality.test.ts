import { describe, expect, it } from "vitest";
import { FORMULAS, filterFormulas } from "../../web/src/formulas.js";
import { isOnboarded, setOnboarded } from "../../web/src/settings.js";
import { LOG_CAP, LocalProgress, type StorageLike } from "../../web/src/store.js";

class MemoryStorage implements StorageLike {
  m = new Map<string, string>();
  getItem(k: string): string | null {
    return this.m.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    this.m.set(k, v);
  }
}

/** setItem が必ず throw する Storage（iOS プライベートモード/quota 超過の再現）。 */
class ThrowingStorage implements StorageLike {
  getItem(): string | null {
    return null;
  }
  setItem(): void {
    throw new DOMException("QuotaExceededError");
  }
}

describe("filterFormulas（公式検索）", () => {
  it("空クエリは全グループを返す", () => {
    expect(filterFormulas(FORMULAS, "")).toEqual(FORMULAS);
  });

  it("名前・式・補足の部分一致で絞り込み、空グループは落とす", () => {
    const hit = filterFormulas(FORMULAS, "力率");
    expect(hit.length).toBeGreaterThan(0);
    for (const g of hit) for (const i of g.items) expect(`${i.name}${i.formula}${i.note ?? ""}`).toContain("力率");
  });

  it("全角・大文字小文字の表記ゆれを吸収する（％Z → %Z）", () => {
    const hit = filterFormulas(FORMULAS, "％Z");
    expect(hit.some((g) => g.items.some((i) => i.formula.includes("%Z")))).toBe(true);
  });

  it("ヒットなしは空配列", () => {
    expect(filterFormulas(FORMULAS, "存在しないキーワードXYZ")).toEqual([]);
  });
});

describe("LocalProgress の保存安全化", () => {
  it("setItem が throw しても record はクラッシュしない（学習継続を優先）", () => {
    const p = new LocalProgress(new ThrowingStorage());
    expect(() => p.record("理論", "good", Date.UTC(2026, 0, 1))).not.toThrow();
  });

  it("解答ログは LOG_CAP で古い順に間引かれる（quota 到達の根本対策）", () => {
    const s = new MemoryStorage();
    const big = Array.from({ length: LOG_CAP }, (_, i) => ({ topic: `t${i}`, correct: true, atMs: i }));
    s.setItem("denken:logs", JSON.stringify(big));
    const p = new LocalProgress(s);
    p.record("新規", "good", Date.UTC(2026, 0, 1));
    const logs = p.logs();
    expect(logs.length).toBe(LOG_CAP);
    expect(logs[0]?.topic).toBe("t1"); // 最古の t0 が間引かれた
    expect(logs[logs.length - 1]?.topic).toBe("新規");
  });
});

describe("オンボーディングの既読管理", () => {
  it("初期状態は未読、setOnboarded で既読になる", () => {
    const s = new MemoryStorage();
    expect(isOnboarded(s)).toBe(false);
    setOnboarded(s);
    expect(isOnboarded(s)).toBe(true);
  });
});
