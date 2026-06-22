import { describe, expect, it } from "vitest";
import {
  CONCEPT_EDGES,
  hasCycle,
  masteredConceptAreas,
  type PrereqEdge,
  recommendNextConcepts,
} from "../../web/src/concept-graph.js";

describe("concept-graph", () => {
  it("既定の前提グラフは循環を持たない（DAG）", () => {
    expect(hasCycle(CONCEPT_EDGES)).toBe(false);
  });

  it("hasCycle: 明示的な循環を検出する", () => {
    const cyclic: PrereqEdge[] = [
      { from: "a", to: "b" },
      { from: "b", to: "c" },
      { from: "c", to: "a" },
    ];
    expect(hasCycle(cyclic)).toBe(true);
  });

  it("hasCycle: 一直線の鎖は循環でない", () => {
    const chain: PrereqEdge[] = [
      { from: "a", to: "b" },
      { from: "b", to: "c" },
    ];
    expect(hasCycle(chain)).toBe(false);
  });

  const edges: PrereqEdge[] = [
    { from: "直流回路", to: "単相交流回路" },
    { from: "単相交流回路", to: "三相交流回路" },
  ];

  it("何も習得していなければ前提ゼロの分野(直流回路)だけが recommended", () => {
    const r = recommendNextConcepts([], edges);
    expect(r.recommended).toContain("直流回路");
    // 前提が未習得の分野は blocked。
    const blockedTopics = r.blocked.map((b) => b.topic);
    expect(blockedTopics).toContain("単相交流回路");
    expect(blockedTopics).toContain("三相交流回路");
  });

  it("前提を習得すると次の分野が recommended に昇格する", () => {
    const r = recommendNextConcepts(["直流回路"], edges);
    expect(r.recommended).toContain("単相交流回路");
    // 直流回路は習得済みなので recommended/blocked のどちらにも入らない。
    expect(r.recommended).not.toContain("直流回路");
    expect(r.blocked.map((b) => b.topic)).not.toContain("直流回路");
    // 三相はまだ前提(単相)未習得で blocked。
    expect(r.blocked.map((b) => b.topic)).toContain("三相交流回路");
  });

  it("blocked には不足している前提が添えられる", () => {
    const r = recommendNextConcepts([], edges);
    const tri = r.blocked.find((b) => b.topic === "三相交流回路");
    expect(tri?.missingPrereqs).toEqual(["単相交流回路"]);
  });

  it("すべて習得済みなら recommended も blocked も空", () => {
    const r = recommendNextConcepts(["直流回路", "単相交流回路", "三相交流回路"], edges);
    expect(r.recommended).toEqual([]);
    expect(r.blocked).toEqual([]);
  });

  it("既定グラフでも readiness が成立する（基礎topicが recommended に出る）", () => {
    const r = recommendNextConcepts([]);
    // 前提を持たない基礎ノード（直流回路・静電気・電子理論）は最初から推奨される。
    expect(r.recommended).toContain("直流回路");
    expect(r.recommended).toContain("静電気");
    expect(r.recommended).toContain("電子理論");
  });
});

describe("masteredConceptAreas", () => {
  it("granular な topic 名から概念ノードを推定する（キーワード部分一致）", () => {
    const areas = masteredConceptAreas(["RLC直列回路の共振", "三相交流電力", "テブナンの定理"]);
    expect(areas.has("単相交流回路")).toBe(true); // RLC・共振
    expect(areas.has("三相交流回路")).toBe(true); // 三相
    expect(areas.has("直流回路")).toBe(true); // テブナン
  });

  it("該当キーワードが無ければ空", () => {
    expect(masteredConceptAreas(["まったく無関係な論点"]).size).toBe(0);
  });

  it("習得済み概念で次の概念が recommend される（実データ topic 経由）", () => {
    const mastered = masteredConceptAreas(["合成抵抗の計算", "キルヒホッフの法則（2メッシュ回路）"]);
    // 直流回路が到達済みとみなされ、単相交流回路が次の推奨に出る。
    const r = recommendNextConcepts(mastered);
    expect(mastered.has("直流回路")).toBe(true);
    expect(r.recommended).toContain("単相交流回路");
  });
});
