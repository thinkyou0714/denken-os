/**
 * pastexam-coverage.test.ts — 過去問出題傾向カバレッジ集計の検証。
 *
 * 1) 純関数（computeSubjectCoverage / computePastExamCoverage / toTemplateLike /
 *    formatCoverageReport）を手組みフィクスチャで全分岐検証。
 * 2) 実レジストリに対する受入条件（理論・法規の全テンプレに pastExam メタが付与され、
 *    area がすべて正準分類に一致＝未知area無し、理論の頻出分野に未カバー無し）を検証。
 */
import { describe, expect, it } from "vitest";
import {
  computePastExamCoverage,
  computeSubjectCoverage,
  formatCoverageReport,
  type PastExamCoverageReport,
  type TemplateLike,
  toTemplateLike,
} from "../../lib/audit/pastexam-coverage.js";
import { getTemplate, listTopics } from "../../lib/engine/templates/index.js";
import { areasForSubject, PASTEXAM_WINDOW, trackedSubjects } from "../../lib/engine/templates/pastexam-areas.js";

describe("pastexam-areas（正準分類）", () => {
  it("PASTEXAM_WINDOW は直近20年 [2006, 2025]", () => {
    expect(PASTEXAM_WINDOW).toEqual([2006, 2025]);
    expect(PASTEXAM_WINDOW[1] - PASTEXAM_WINDOW[0]).toBe(19); // 20年分（両端含む）
  });

  it("trackedSubjects は理論・法規を含む", () => {
    const tracked = trackedSubjects();
    expect(tracked).toContain("理論");
    expect(tracked).toContain("法規");
  });

  it("areasForSubject: 登録科目は分野を返し、未登録科目は空配列", () => {
    expect(areasForSubject("理論").length).toBeGreaterThan(0);
    expect(areasForSubject("法規").length).toBeGreaterThan(0);
    // 機械はタクソノミ未登録 → 空（カバレッジ計算の対象外）
    expect(areasForSubject("機械")).toEqual([]);
  });
});

describe("computeSubjectCoverage（手組みフィクスチャ・全分岐）", () => {
  // 理論の正準分野名を1つ取得（フィクスチャで「カバー済み」を作るため）。
  const knownArea = areasForSubject("理論")[0]?.area as string;

  const fixtures: TemplateLike[] = [
    { topic: "覆う問題", subject: "理論", pastExam: { area: knownArea, frequency: "high" } },
    { topic: "別科目（無視される）", subject: "法規", pastExam: { area: knownArea, frequency: "high" } },
    { topic: "メタ無し問題", subject: "理論" }, // pastExam 無し → templatesWithMeta に数えない
    { topic: "未知area問題", subject: "理論", pastExam: { area: "存在しない分野XYZ", frequency: "low" } },
  ];

  const cov = computeSubjectCoverage("理論", fixtures);

  it("当該科目のテンプレのみ集計する（他科目は除外）", () => {
    expect(cov.templatesTotal).toBe(3); // 理論3件（法規1件は除外）
    expect(cov.templatesWithMeta).toBe(2); // メタ有り2件（覆う問題・未知area問題）
  });

  it("正準分野にマッチした分野が covered になる", () => {
    const target = cov.areas.find((a) => a.area === knownArea);
    expect(target?.covered).toBe(true);
    expect(target?.templateCount).toBe(1);
    expect(target?.topics).toEqual(["覆う問題"]);
  });

  it("未知 area はカバー扱いされず unknownAreaTopics に入る", () => {
    expect(cov.unknownAreaTopics).toContain("未知area問題");
    // 「存在しない分野XYZ」はどの canonical area にも計上されない
    expect(cov.areas.some((a) => a.area === "存在しない分野XYZ")).toBe(false);
  });

  it("coverageRatio は covered/total（0..1）", () => {
    expect(cov.coverageRatio).toBeGreaterThan(0);
    expect(cov.coverageRatio).toBeLessThanOrEqual(1);
    expect(cov.coveredAreas).toBe(1);
    expect(cov.totalAreas).toBe(areasForSubject("理論").length);
  });

  it("メタ無し科目（タクソノミ未登録）は totalAreas=0・ratio=1", () => {
    const machineCov = computeSubjectCoverage("機械", [{ topic: "x", subject: "機械" }]);
    expect(machineCov.totalAreas).toBe(0);
    expect(machineCov.coverageRatio).toBe(1);
  });
});

describe("computePastExamCoverage / toTemplateLike", () => {
  it("空配列でも落ちず、追跡科目分の SubjectCoverage を返す", () => {
    const report = computePastExamCoverage([]);
    expect(report.subjects.length).toBe(trackedSubjects().length);
    expect(report.totalTemplates).toBe(0);
    expect(report.templatesWithMeta).toBe(0);
    expect(report.window).toEqual(PASTEXAM_WINDOW);
  });

  it("toTemplateLike: pastExam の有無でキーを出し分ける", () => {
    // 理論テンプレ（バックフィル済み）→ pastExam 有り
    const theory = getTemplate("最大電力伝送");
    expect(theory).toBeDefined();
    const withMeta = toTemplateLike(theory!);
    expect(withMeta.pastExam).toBeDefined();

    // 機械テンプレ（メタ未付与）→ pastExam キー自体を持たない
    const machine = getTemplate("需要率") ?? getTemplate("誘導電動機の回転速度");
    expect(machine).toBeDefined();
    const noMeta = toTemplateLike(machine!);
    expect("pastExam" in noMeta).toBe(false);
  });
});

describe("formatCoverageReport（全分岐を合成レポートで網羅）", () => {
  const report: PastExamCoverageReport = {
    window: [2006, 2025],
    totalTemplates: 5,
    templatesWithMeta: 3,
    overallCoverageRatio: 0.5,
    subjects: [
      {
        subject: "理論",
        totalAreas: 3,
        coveredAreas: 1,
        coverageRatio: 0.33,
        templatesWithMeta: 1,
        templatesTotal: 2,
        uncoveredHighFrequency: ["未カバー頻出"],
        unknownAreaTopics: ["綴り揺れ問題"],
        areas: [
          { area: "覆済", frequency: "high", templateCount: 1, covered: true, topics: ["t1"] },
          { area: "未カバー頻出", frequency: "high", templateCount: 0, covered: false, topics: [] },
          { area: "稀分野", frequency: "low", templateCount: 0, covered: false, topics: [] },
        ],
      },
    ],
  };

  const text = formatCoverageReport(report);

  it("ヘッダ・年スパン・全体行を含む", () => {
    expect(text).toContain("2006–2025");
    expect(text).toContain("追跡科目平均 50%");
    expect(text).toContain("メタ付与 3/5");
  });

  it("カバー済(✓)・未カバー(·)・頻度表記(★毎年/・稀)を出し分ける", () => {
    expect(text).toContain("✓");
    expect(text).toContain("·");
    expect(text).toContain("★毎年");
    expect(text).toContain("・稀"); // low 頻度の分岐
  });

  it("未カバー頻出分野と未知area指定の警告行を出す", () => {
    expect(text).toContain("⚠ 未カバーの頻出分野（優先補強）: 未カバー頻出");
    expect(text).toContain("⚠ 正準分類に無いarea指定: 綴り揺れ問題");
  });

  it("mid 頻度（・数年）も整形できる", () => {
    const midText = formatCoverageReport({
      ...report,
      subjects: [
        {
          ...report.subjects[0]!,
          uncoveredHighFrequency: [],
          unknownAreaTopics: [],
          areas: [{ area: "数年分野", frequency: "mid", templateCount: 1, covered: true, topics: ["m1"] }],
        },
      ],
    });
    expect(midText).toContain("・数年");
  });
});

describe("受入条件: 実レジストリ（理論・法規の20年分メタ整備）", () => {
  it("理論・法規の全テンプレに pastExam メタが付与されている", () => {
    const missing: string[] = [];
    for (const topic of listTopics()) {
      const t = getTemplate(topic);
      if (!t) continue;
      if ((t.subject === "理論" || t.subject === "法規") && !t.pastExam) missing.push(topic);
    }
    expect(missing, `メタ未付与: ${missing.join(", ")}`).toEqual([]);
  });

  it("理論・法規の pastExam.area はすべて正準分類に一致する（未知area無し）", () => {
    const report = computePastExamCoverage(
      listTopics()
        .map((topic) => getTemplate(topic))
        .filter((t): t is NonNullable<typeof t> => t !== undefined)
        .map(toTemplateLike),
    );
    for (const s of report.subjects) {
      expect(s.unknownAreaTopics, `${s.subject} に未知area: ${s.unknownAreaTopics.join(", ")}`).toEqual([]);
    }
  });

  it("理論は頻出(high)分野に未カバーが無い", () => {
    const report = computePastExamCoverage(
      listTopics()
        .map((topic) => getTemplate(topic))
        .filter((t): t is NonNullable<typeof t> => t !== undefined)
        .map(toTemplateLike),
    );
    const theory = report.subjects.find((s) => s.subject === "理論");
    expect(theory?.uncoveredHighFrequency, "理論の未カバー頻出分野").toEqual([]);
  });

  it("メタ付与テンプレ数は新規10種＋バックフィル分（>=32）", () => {
    const report = computePastExamCoverage(
      listTopics()
        .map((topic) => getTemplate(topic))
        .filter((t): t is NonNullable<typeof t> => t !== undefined)
        .map(toTemplateLike),
    );
    expect(report.templatesWithMeta).toBeGreaterThanOrEqual(32);
  });
});
