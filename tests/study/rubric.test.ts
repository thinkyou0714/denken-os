import { describe, expect, it } from "vitest";
import type { RubricItem } from "../../lib/engine/schema.js";
import {
  accumulateAspects,
  aspectReadiness,
  keywordHits,
  maxPoints,
  rubricFeedback,
  scoreRubric,
} from "../../lib/study/rubric.js";

const rubric: RubricItem[] = [
  { id: "formula", points: 3, criterion: "式を提示", keywords: ["ε", "cos"], required: true },
  { id: "sin", points: 2, criterion: "sinθ を求める", keywords: ["sin"] },
  { id: "result", points: 2, criterion: "結論を単位つきで", keywords: ["%"], required: true },
  { id: "note", points: 1, criterion: "補足に言及" },
];

describe("maxPoints", () => {
  it("配点の合計を返す", () => {
    expect(maxPoints(rubric)).toBe(8);
  });
});

describe("scoreRubric — 部分点採点", () => {
  it("満点採点で満点・合格", () => {
    const s = scoreRubric(rubric, [
      { id: "formula", mark: "full" },
      { id: "sin", mark: "full" },
      { id: "result", mark: "full" },
      { id: "note", mark: "full" },
    ]);
    expect(s.awarded).toBe(8);
    expect(s.ratio).toBe(1);
    expect(s.passed).toBe(true);
    expect(s.weakItemIds).toEqual([]);
  });

  it("partial は配点の半分", () => {
    const s = scoreRubric(rubric, [{ id: "formula", mark: "partial" }]); // 3*0.5=1.5
    expect(s.awarded).toBe(1.5);
  });

  it("marks に無い項目は未達(none)扱い", () => {
    const s = scoreRubric(rubric, [{ id: "formula", mark: "full" }]);
    expect(s.awarded).toBe(3);
    expect(s.items.find((i) => i.id === "sin")!.mark).toBe("none");
  });

  it("必須観点を未達にすると、得点率が高くても不合格", () => {
    // formula(3)満点 + sin(2)満点 + note(1)満点 = 6/8=75% だが必須 result が未達
    const s = scoreRubric(rubric, [
      { id: "formula", mark: "full" },
      { id: "sin", mark: "full" },
      { id: "note", mark: "full" },
    ]);
    expect(s.ratio).toBeGreaterThan(0.6);
    expect(s.missingRequired).toEqual(["result"]);
    expect(s.passed).toBe(false);
  });

  it("60%以上かつ必須充足で合格", () => {
    // formula(3)+result(2)=5/8=62.5%、必須2つとも満点
    const s = scoreRubric(rubric, [
      { id: "formula", mark: "full" },
      { id: "result", mark: "full" },
    ]);
    expect(s.ratio).toBeGreaterThanOrEqual(0.6);
    expect(s.missingRequired).toEqual([]);
    expect(s.passed).toBe(true);
  });

  it("満点でない観点を弱点として返す", () => {
    const s = scoreRubric(rubric, [
      { id: "formula", mark: "full" },
      { id: "sin", mark: "partial" },
    ]);
    expect(s.weakItemIds).toEqual(expect.arrayContaining(["sin", "result", "note"]));
    expect(s.weakItemIds).not.toContain("formula");
  });

  it("空ルーブリックは安全（0点・不合格）", () => {
    const s = scoreRubric([], []);
    expect(s.maxPoints).toBe(0);
    expect(s.ratio).toBe(0);
    expect(s.passed).toBe(false);
  });
});

describe("keywordHits — 自己採点の補助", () => {
  it("記述に含まれるキーワードを数える（表記ゆれ吸収）", () => {
    const hits = keywordHits(rubric, "εは cos と SIN を使い、結果は4.6% です");
    const formula = hits.find((h) => h.id === "formula")!;
    expect(formula.hit).toBe(2); // ε, cos
    expect(formula.missing).toEqual([]);
    const result = hits.find((h) => h.id === "result")!;
    expect(result.hit).toBe(1); // %
  });

  it("キーワード未設定の項目は対象外", () => {
    const ids = keywordHits(rubric, "なにか").map((h) => h.id);
    expect(ids).not.toContain("note"); // note は keywords 無し
  });

  it("欠けているキーワードを missing に挙げる", () => {
    const hits = keywordHits(rubric, "なにも書いていない");
    const formula = hits.find((h) => h.id === "formula")!;
    expect(formula.missing).toEqual(expect.arrayContaining(["ε", "cos"]));
  });
});

describe("rubricFeedback — 講評", () => {
  it("必須欠落を最優先で警告", () => {
    const s = scoreRubric(rubric, [{ id: "formula", mark: "full" }]); // result(必須)未達
    expect(rubricFeedback(s)).toContain("必須");
  });

  it("合格は前向きな講評", () => {
    const s = scoreRubric(rubric, [
      { id: "formula", mark: "full" },
      { id: "result", mark: "full" },
    ]);
    expect(rubricFeedback(s)).toContain("合格ライン");
  });

  it("ルーブリック無しは明示", () => {
    expect(rubricFeedback(scoreRubric([], []))).toContain("ルーブリック");
  });
});

const aspectRubric: RubricItem[] = [
  { id: "f", points: 3, criterion: "立式", aspect: "立式" },
  { id: "c1", points: 2, criterion: "計算1", aspect: "計算" },
  { id: "c2", points: 2, criterion: "計算2", aspect: "計算" },
  { id: "r", points: 3, criterion: "論述", aspect: "論述" },
];

describe("scoreRubric — 観点別(byAspect)", () => {
  it("aspect ごとに配点・獲得を集計し、得点率の低い順に並ぶ", () => {
    const s = scoreRubric(aspectRubric, [
      { id: "f", mark: "full" }, // 立式 3/3
      { id: "c1", mark: "partial" }, // 計算 1/2
      { id: "c2", mark: "none" }, // 計算 0/2 → 計算 1/4
      { id: "r", mark: "none" }, // 論述 0/3
    ]);
    const byId = new Map(s.byAspect.map((a) => [a.aspect, a]));
    expect(byId.get("立式")).toMatchObject({ points: 3, awarded: 3, ratio: 1 });
    expect(byId.get("計算")).toMatchObject({ points: 4, awarded: 1, ratio: 0.25 });
    expect(byId.get("論述")).toMatchObject({ points: 3, awarded: 0, ratio: 0 });
    expect(s.byAspect[0]!.aspect).toBe("論述"); // 0% が先頭
  });

  it("aspect 無し項目は byAspect に現れない", () => {
    const s = scoreRubric([{ id: "x", points: 2, criterion: "無タグ" }], [{ id: "x", mark: "full" }]);
    expect(s.byAspect).toEqual([]);
  });
});

describe("accumulateAspects / aspectReadiness — セッション横断の観点弱点", () => {
  it("複数回の採点を観点別に足し込む", () => {
    const s1 = scoreRubric(aspectRubric, [{ id: "f", mark: "full" }]); // 立式3/3, 計算0/4, 論述0/3
    const s2 = scoreRubric(aspectRubric, [{ id: "c1", mark: "full" }]); // 計算+2/4
    const total = accumulateAspects(accumulateAspects([], s1), s2);
    const calc = total.find((t) => t.aspect === "計算")!;
    expect(calc.points).toBe(8); // 4+4
    expect(calc.awarded).toBe(2); // 0+2
  });

  it("到達度を低い順に出し、配点不足は判定保留", () => {
    const total = [
      { aspect: "立式" as const, points: 10, awarded: 9 },
      { aspect: "論述" as const, points: 10, awarded: 3 },
      { aspect: "計算" as const, points: 2, awarded: 0 }, // points<6 → enoughData=false
    ];
    const r = aspectReadiness(total);
    expect(r[0]!.aspect).toBe("計算"); // ratio 0 が先頭（保留でも順序は ratio）
    const ronjutsu = r.find((a) => a.aspect === "論述")!;
    expect(ronjutsu.onTrack).toBe(false);
    expect(ronjutsu.enoughData).toBe(true);
    const ritsu = r.find((a) => a.aspect === "立式")!;
    expect(ritsu.onTrack).toBe(true);
    expect(r.find((a) => a.aspect === "計算")!.enoughData).toBe(false);
  });
});
