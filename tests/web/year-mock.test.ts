import { describe, expect, it } from "vitest";
import type { Problem, Subject } from "../../lib/engine/schema.js";
import { buildYearMock } from "../../web/src/year-mock.js";
import { seededRng } from "../helpers/rng.js";

function prob(id: string, subject: Subject, topic: string): Problem {
  return {
    id,
    subject,
    topic,
    difficulty: 2,
    statement: "x",
    answer: "1",
    solution: ["1"],
    validation: { solver_checked: true, human_checked: false, clean_answer: true, physically_valid: true },
    source: { type: "original" },
  };
}

// 理論に複数 topic、電力にも問題を用意（科目フィルタの検証用）。
const pool: Problem[] = [
  prob("理1", "理論", "直流回路"),
  prob("理2", "理論", "直流回路"),
  prob("理3", "理論", "単相交流回路"),
  prob("理4", "理論", "三相交流回路"),
  prob("理5", "理論", "電磁気"),
  prob("理6", "理論", "静電気"),
  prob("電1", "電力", "水力発電"),
  prob("電2", "電力", "火力発電"),
];

describe("buildYearMock（年度別通し模試）", () => {
  it("指定科目だけを出題する", () => {
    const set = buildYearMock(pool, { subject: "理論", count: 4, rng: seededRng(1) });
    expect(set.length).toBe(4);
    expect(set.every((p) => p.subject === "理論")).toBe(true);
  });

  it("重複 ID を出さない", () => {
    const set = buildYearMock(pool, { subject: "理論", count: 6, rng: seededRng(2) });
    expect(new Set(set.map((p) => p.id)).size).toBe(set.length);
  });

  it("可能な範囲で topic 重複を避ける（論点を広く取る）", () => {
    // 理論は topic が5種・直流回路が2問。4問取れば全て別 topic にできるはず。
    const set = buildYearMock(pool, { subject: "理論", count: 4, rng: seededRng(3) });
    const topics = set.map((p) => p.topic);
    expect(new Set(topics).size).toBe(topics.length);
  });

  it("count がプール超でも科目の全件まで（重複なし）", () => {
    const set = buildYearMock(pool, { subject: "電力", count: 99, rng: seededRng(4) });
    expect(set.length).toBe(2);
    expect(set.every((p) => p.subject === "電力")).toBe(true);
  });

  it("seed が同じなら決定論的に同一", () => {
    const a = buildYearMock(pool, { subject: "理論", count: 5, rng: seededRng(9) });
    const b = buildYearMock(pool, { subject: "理論", count: 5, rng: seededRng(9) });
    expect(a.map((p) => p.id)).toEqual(b.map((p) => p.id));
  });

  it("該当科目の問題が無ければ空", () => {
    const set = buildYearMock(pool, { subject: "法規", count: 5, rng: seededRng(1) });
    expect(set).toEqual([]);
  });

  it("count=0 は空", () => {
    expect(buildYearMock(pool, { subject: "理論", count: 0, rng: seededRng(1) })).toEqual([]);
  });

  it("area 頻度マップがあれば high 分野を多めに出す", () => {
    // 直流回路=high, 静電気=low。high の方が多くサンプルされる傾向を確認する。
    const areaOf = (p: Problem): string | undefined =>
      p.topic === "直流回路" ? "基礎" : p.topic === "静電気" ? "応用稀" : undefined;
    const freq = { 基礎: "high", 応用稀: "low" } as const;
    // 直流回路を3問・静電気を3問に増やしたプール（重みの効きを見やすく）。
    const wpool: Problem[] = [
      ...["a", "b", "c"].map((i) => prob(`dc${i}`, "理論", "直流回路")),
      ...["a", "b", "c"].map((i) => prob(`st${i}`, "理論", "静電気")),
    ];
    const set = buildYearMock(wpool, {
      subject: "理論",
      count: 4,
      rng: seededRng(5),
      areaOfProblem: areaOf,
      areaFrequency: freq,
    });
    // 全件 理論・重複なし。
    expect(set.every((p) => p.subject === "理論")).toBe(true);
    expect(new Set(set.map((p) => p.id)).size).toBe(set.length);
    // high(基礎) の出題数 >= low(応用稀) の出題数。
    const basics = set.filter((p) => p.topic === "直流回路").length;
    const rare = set.filter((p) => p.topic === "静電気").length;
    expect(basics).toBeGreaterThanOrEqual(rare);
  });
});
